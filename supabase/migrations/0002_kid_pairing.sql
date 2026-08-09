-- Kid device pairing: lets a kid's own phone bind to an EXISTING family_members
-- row (created by a parent) via a short code, using an anonymous Supabase Auth
-- session -- kids never get an email/password of their own.
--
-- Requires "Anonymous Sign-Ins" to be enabled in Supabase Auth settings
-- (Dashboard -> Authentication -> Sign In / Providers -> Anonymous Sign-Ins).

create table kid_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references family_members (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table kid_pairing_codes enable row level security;

create policy "member can read own family's pairing codes" on kid_pairing_codes
  for select using (
    exists (select 1 from family_members m where m.id = member_id and is_family_member(m.family_id))
  );
create policy "member can create pairing codes for own family" on kid_pairing_codes
  for insert with check (
    exists (select 1 from family_members m where m.id = member_id and is_family_member(m.family_id))
  );

create function claim_kid_profile(pairing_code text) returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  target_member_id uuid;
  target_family_id uuid;
begin
  select member_id into target_member_id
  from kid_pairing_codes
  where code = pairing_code
    and expires_at > now()
    and used_at is null;

  if target_member_id is null then
    raise exception 'Invalid or expired pairing code';
  end if;

  select family_id into target_family_id from family_members where id = target_member_id and role = 'kid' and user_id is null;

  if target_family_id is null then
    raise exception 'This profile is not available to claim';
  end if;

  update kid_pairing_codes set used_at = now() where code = pairing_code;
  update family_members set user_id = auth.uid() where id = target_member_id;

  return target_family_id;
end;
$$;
