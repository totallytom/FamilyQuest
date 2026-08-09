import { supabase } from '@/data/supabaseClient';
import type {
  CompletionStatus,
  Family,
  FamilyMember,
  Role,
  Routine,
  RoutineTask,
  TaskCompletion,
  Weekday,
} from '@/types/models';

/**
 * The only file that talks to Supabase directly (mirrors the role `storage.ts`
 * played for AsyncStorage) — one function per entity, each a thin query.
 * `AppDataContext.tsx` calls these and keeps its existing action signatures.
 */

export interface FamilyData {
  family: Family;
  members: FamilyMember[];
  routines: Routine[];
  tasks: RoutineTask[];
  completions: TaskCompletion[];
}

export function mapFamily(row: any): Family {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function mapMember(row: any): FamilyMember {
  return {
    id: row.id,
    familyId: row.family_id,
    userId: row.user_id ?? undefined,
    name: row.name,
    role: row.role,
    color: row.color,
    emoji: row.emoji,
    points: row.points,
  };
}

export function mapRoutine(row: any): Routine {
  return { id: row.id, familyId: row.family_id, memberId: row.member_id, title: row.title, icon: row.icon, color: row.color };
}

export function mapTask(row: any): RoutineTask {
  return {
    id: row.id,
    routineId: row.routine_id,
    memberId: row.member_id,
    title: row.title,
    icon: row.icon,
    daysOfWeek: row.days_of_week,
    points: row.points,
  };
}

export function mapCompletion(row: any): TaskCompletion {
  return {
    id: row.id,
    taskId: row.task_id,
    memberId: row.member_id,
    date: row.date,
    status: row.status,
    completedAt: row.completed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

export async function fetchFamilyData(familyId: string): Promise<FamilyData> {
  const [{ data: familyRow, error: familyError }, { data: memberRows, error: memberError }, { data: routineRows, error: routineError }] =
    await Promise.all([
      supabase.from('families').select('*').eq('id', familyId).single(),
      supabase.from('family_members').select('*').eq('family_id', familyId),
      supabase.from('routines').select('*').eq('family_id', familyId),
    ]);
  if (familyError) throw familyError;
  if (memberError) throw memberError;
  if (routineError) throw routineError;

  const routineIds = (routineRows ?? []).map((r) => r.id);
  const { data: taskRows, error: taskError } = routineIds.length
    ? await supabase.from('routine_tasks').select('*').in('routine_id', routineIds)
    : { data: [], error: null };
  if (taskError) throw taskError;

  const taskIds = (taskRows ?? []).map((t) => t.id);
  const { data: completionRows, error: completionError } = taskIds.length
    ? await supabase.from('task_completions').select('*').in('task_id', taskIds)
    : { data: [], error: null };
  if (completionError) throw completionError;

  return {
    family: mapFamily(familyRow),
    members: (memberRows ?? []).map(mapMember),
    routines: (routineRows ?? []).map(mapRoutine),
    tasks: (taskRows ?? []).map(mapTask),
    completions: (completionRows ?? []).map(mapCompletion),
  };
}

export async function insertMember(input: { familyId: string; name: string; role: Role; color: string; emoji: string }): Promise<FamilyMember> {
  const { data, error } = await supabase
    .from('family_members')
    .insert({ family_id: input.familyId, name: input.name, role: input.role, color: input.color, emoji: input.emoji, points: 0 })
    .select()
    .single();
  if (error) throw error;
  return mapMember(data);
}

export async function updateMember(id: string, patch: Partial<Omit<FamilyMember, 'id' | 'familyId'>>): Promise<void> {
  const { error } = await supabase.from('family_members').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('family_members').delete().eq('id', id);
  if (error) throw error;
}

export async function insertRoutine(input: { familyId: string; memberId: string; title: string; icon: string; color: string }): Promise<Routine> {
  const { data, error } = await supabase
    .from('routines')
    .insert({ family_id: input.familyId, member_id: input.memberId, title: input.title, icon: input.icon, color: input.color })
    .select()
    .single();
  if (error) throw error;
  return mapRoutine(data);
}

export async function updateRoutine(id: string, patch: Partial<Omit<Routine, 'id' | 'familyId'>>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.memberId !== undefined) payload.member_id = patch.memberId;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.icon !== undefined) payload.icon = patch.icon;
  if (patch.color !== undefined) payload.color = patch.color;
  const { error } = await supabase.from('routines').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function insertTask(input: {
  routineId: string;
  memberId: string;
  title: string;
  icon: string;
  daysOfWeek: Weekday[];
  points: number;
}): Promise<RoutineTask> {
  const { data, error } = await supabase
    .from('routine_tasks')
    .insert({
      routine_id: input.routineId,
      member_id: input.memberId,
      title: input.title,
      icon: input.icon,
      days_of_week: input.daysOfWeek,
      points: input.points,
    })
    .select()
    .single();
  if (error) throw error;
  return mapTask(data);
}

export async function updateTask(id: string, patch: Partial<Omit<RoutineTask, 'id' | 'routineId' | 'memberId'>>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.icon !== undefined) payload.icon = patch.icon;
  if (patch.daysOfWeek !== undefined) payload.days_of_week = patch.daysOfWeek;
  if (patch.points !== undefined) payload.points = patch.points;
  const { error } = await supabase.from('routine_tasks').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('routine_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCompletion(input: {
  taskId: string;
  memberId: string;
  date: string;
  status: CompletionStatus;
  completedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}): Promise<TaskCompletion> {
  const { data, error } = await supabase
    .from('task_completions')
    .upsert(
      {
        task_id: input.taskId,
        member_id: input.memberId,
        date: input.date,
        status: input.status,
        completed_at: input.completedAt ?? null,
        reviewed_by: input.reviewedBy ?? null,
        reviewed_at: input.reviewedAt ?? null,
      },
      { onConflict: 'task_id,date' }
    )
    .select()
    .single();
  if (error) throw error;
  return mapCompletion(data);
}

export async function deleteCompletion(taskId: string, date: string): Promise<void> {
  const { error } = await supabase.from('task_completions').delete().eq('task_id', taskId).eq('date', date);
  if (error) throw error;
}

export async function updateMemberPoints(id: string, points: number): Promise<void> {
  const { error } = await supabase.from('family_members').update({ points }).eq('id', id);
  if (error) throw error;
}
