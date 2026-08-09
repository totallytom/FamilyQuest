-- FamilyQuest initial schema
-- Run this in the Supabase SQL editor (or `supabase db push` once the CLI is linked).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  role text not null check (role in ('parent', 'kid')),
  color text not null,
  emoji text not null,
  points integer not null default 0
);

create table routines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  title text not null,
  icon text not null,
  color text not null
);

create table routine_tasks (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  title text not null,
  icon text not null,
  days_of_week smallint[] not null,
  points integer not null default 0
);

create table task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references routine_tasks (id) on delete cascade,
  member_id uuid not null references family_members (id) on delete cascade,
  date date not null,
  status text not null check (status in ('done', 'approved', 'rejected')),
  completed_at timestamptz,
  reviewed_by uuid references family_members (id) on delete set null,
  reviewed_at timestamptz,
  unique (task_id, date)
);

create table family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER avoids recursive RLS on family_members)
-- ---------------------------------------------------------------------------

create function is_family_member(fid uuid) returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from family_members where family_id = fid and user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table families enable row level security;
alter table family_members enable row level security;
alter table routines enable row level security;
alter table routine_tasks enable row level security;
alter table task_completions enable row level security;
alter table family_invites enable row level security;

-- families
create policy "member can read own family" on families
  for select using (is_family_member(id));
create policy "member can update own family" on families
  for update using (is_family_member(id));
-- No insert policy: families are only ever created via create_family_with_owner(),
-- a SECURITY DEFINER function that bootstraps the creator's own membership row too.

-- family_members
create policy "member can read own family's members" on family_members
  for select using (is_family_member(family_id));
create policy "member can insert into own family" on family_members
  for insert with check (is_family_member(family_id));
create policy "member can update own family's members" on family_members
  for update using (is_family_member(family_id));
create policy "member can delete own family's members" on family_members
  for delete using (is_family_member(family_id));

-- routines
create policy "member can read own family's routines" on routines
  for select using (is_family_member(family_id));
create policy "member can insert own family's routines" on routines
  for insert with check (is_family_member(family_id));
create policy "member can update own family's routines" on routines
  for update using (is_family_member(family_id));
create policy "member can delete own family's routines" on routines
  for delete using (is_family_member(family_id));

-- routine_tasks (no family_id column directly -- join through routines)
create policy "member can read own family's tasks" on routine_tasks
  for select using (
    exists (select 1 from routines r where r.id = routine_id and is_family_member(r.family_id))
  );
create policy "member can insert own family's tasks" on routine_tasks
  for insert with check (
    exists (select 1 from routines r where r.id = routine_id and is_family_member(r.family_id))
  );
create policy "member can update own family's tasks" on routine_tasks
  for update using (
    exists (select 1 from routines r where r.id = routine_id and is_family_member(r.family_id))
  );
create policy "member can delete own family's tasks" on routine_tasks
  for delete using (
    exists (select 1 from routines r where r.id = routine_id and is_family_member(r.family_id))
  );

-- task_completions (join through routine_tasks -> routines)
create policy "member can read own family's completions" on task_completions
  for select using (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id and is_family_member(r.family_id)
    )
  );
create policy "member can insert own family's completions" on task_completions
  for insert with check (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id and is_family_member(r.family_id)
    )
  );
create policy "member can update own family's completions" on task_completions
  for update using (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id and is_family_member(r.family_id)
    )
  );
create policy "member can delete own family's completions" on task_completions
  for delete using (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id and is_family_member(r.family_id)
    )
  );

-- family_invites: a member can create/read invites for their own family;
-- joining a family by code is done via the security-definer RPC below, which
-- bypasses these policies deliberately (an unauthenticated-to-family user
-- must be able to look up a code that isn't theirs yet).
create policy "member can read own family's invites" on family_invites
  for select using (is_family_member(family_id));
create policy "member can create invites for own family" on family_invites
  for insert with check (is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- Family-creation RPC (security definer: bootstraps the creator's own
-- family_members row, which plain RLS can't allow since no membership row
-- exists yet to satisfy is_family_member())
-- ---------------------------------------------------------------------------

create function create_family_with_owner(
  family_name text,
  owner_name text,
  owner_color text,
  owner_emoji text
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  new_family_id uuid;
begin
  insert into families (name) values (family_name) returning id into new_family_id;

  insert into family_members (family_id, user_id, name, role, color, emoji, points)
  values (new_family_id, auth.uid(), owner_name, 'parent', owner_color, owner_emoji, 0);

  return new_family_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Join-by-code RPC (security definer: runs as the invite creator's privileges
-- so the joining user can redeem a code for a family they aren't in yet)
-- ---------------------------------------------------------------------------

create function join_family_with_code(
  invite_code text,
  member_name text,
  member_color text,
  member_emoji text
) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  target_family_id uuid;
begin
  select family_id into target_family_id
  from family_invites
  where code = invite_code
    and expires_at > now()
    and used_by is null;

  if target_family_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  update family_invites set used_by = auth.uid() where code = invite_code;

  insert into family_members (family_id, user_id, name, role, color, emoji, points)
  values (target_family_id, auth.uid(), member_name, 'parent', member_color, member_emoji, 0);

  return target_family_id;
end;
$$;
