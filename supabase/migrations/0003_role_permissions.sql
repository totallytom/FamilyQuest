-- Role-based write restrictions.
--
-- 0001's policies only checked family membership, not role, so any signed-in
-- family member (including a kid, once kid pairing gives them their own real
-- auth session instead of just a shared-device UI toggle) could edit routines,
-- remove other members, tamper with points, or approve their own tasks by
-- calling Supabase directly. The app's "parent-only" UI gating cannot enforce
-- this on its own -- it only hides buttons, it doesn't stop the request.

create function is_parent_of_family(fid uuid) returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from family_members where family_id = fid and user_id = auth.uid() and role = 'parent'
  )
$$;

-- family_members: only parents manage the roster.
drop policy "member can insert into own family" on family_members;
create policy "parent can insert into own family" on family_members
  for insert with check (is_parent_of_family(family_id));

drop policy "member can update own family's members" on family_members;
create policy "parent can update own family's members" on family_members
  for update using (is_parent_of_family(family_id));

drop policy "member can delete own family's members" on family_members;
create policy "parent can delete own family's members" on family_members
  for delete using (is_parent_of_family(family_id));

-- routines: only parents create/edit/delete; everyone in the family can still read.
drop policy "member can insert own family's routines" on routines;
create policy "parent can insert own family's routines" on routines
  for insert with check (is_parent_of_family(family_id));

drop policy "member can update own family's routines" on routines;
create policy "parent can update own family's routines" on routines
  for update using (is_parent_of_family(family_id));

drop policy "member can delete own family's routines" on routines;
create policy "parent can delete own family's routines" on routines
  for delete using (is_parent_of_family(family_id));

-- routine_tasks: same, parent-only writes.
drop policy "member can insert own family's tasks" on routine_tasks;
create policy "parent can insert own family's tasks" on routine_tasks
  for insert with check (
    exists (select 1 from routines r where r.id = routine_id and is_parent_of_family(r.family_id))
  );

drop policy "member can update own family's tasks" on routine_tasks;
create policy "parent can update own family's tasks" on routine_tasks
  for update using (
    exists (select 1 from routines r where r.id = routine_id and is_parent_of_family(r.family_id))
  );

drop policy "member can delete own family's tasks" on routine_tasks;
create policy "parent can delete own family's tasks" on routine_tasks
  for delete using (
    exists (select 1 from routines r where r.id = routine_id and is_parent_of_family(r.family_id))
  );

-- task_completions: a member can only mark their OWN tasks 'done' (and redo
-- that after a rejection); only a parent can move a completion to
-- 'approved'/'rejected' -- closes the self-approval hole.
drop policy "member can insert own family's completions" on task_completions;
create policy "member can mark own tasks done" on task_completions
  for insert with check (
    status = 'done'
    and exists (select 1 from family_members m where m.id = member_id and m.user_id = auth.uid())
    and exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id and is_family_member(r.family_id)
    )
  );

drop policy "member can update own family's completions" on task_completions;
create policy "member can redo own task, parent can review any" on task_completions
  for update using (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id
        and (
          is_parent_of_family(r.family_id)
          or exists (select 1 from family_members m where m.id = member_id and m.user_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id
        and (
          is_parent_of_family(r.family_id)
          or (status = 'done' and exists (select 1 from family_members m where m.id = member_id and m.user_id = auth.uid()))
        )
    )
  );

drop policy "member can delete own family's completions" on task_completions;
create policy "member can delete own done completion, parent can delete any" on task_completions
  for delete using (
    exists (
      select 1 from routine_tasks t
      join routines r on r.id = t.routine_id
      where t.id = task_id
        and (
          is_parent_of_family(r.family_id)
          or (status = 'done' and exists (select 1 from family_members m where m.id = member_id and m.user_id = auth.uid()))
        )
    )
  );

-- kid_pairing_codes: only a parent should be able to mint a pairing code.
drop policy "member can create pairing codes for own family" on kid_pairing_codes;
create policy "parent can create pairing codes for own family" on kid_pairing_codes
  for insert with check (
    exists (select 1 from family_members m where m.id = member_id and is_parent_of_family(m.family_id))
  );
