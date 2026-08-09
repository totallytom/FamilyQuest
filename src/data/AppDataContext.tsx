import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
import { generateId } from '@/utils/id';
import { dateKey } from '@/utils/date';
import { findCompletion } from '@/data/selectors';
import { generateDemoData } from '@/data/seed';
import { readJSON, removeKeys, StorageKeys, writeJSON } from '@/data/storage';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabaseClient';
import * as repo from '@/data/repository';

type Mode = 'demo' | 'real' | null;

interface AppDataState {
  isLoading: boolean;
  family: Family | null;
  members: FamilyMember[];
  routines: Routine[];
  tasks: RoutineTask[];
  completions: TaskCompletion[];
  currentMemberId: string | null;
  /** The signed-in user's own member row — the source of truth for role gating (unlike currentMemberId, which is just a freely-switchable "viewing as" preference). Falls back to currentMemberId in demo mode, where there's no real auth session to anchor to. */
  myMemberId: string | null;
  isDemoMode: boolean;
}

interface AppDataActions {
  loadDemoFamily: () => Promise<void>;
  resetDemoData: () => Promise<void>;

  addMember: (input: { name: string; role: Role; color: string; emoji: string }) => Promise<FamilyMember>;
  updateMember: (id: string, patch: Partial<Omit<FamilyMember, 'id' | 'familyId'>>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  setCurrentMember: (id: string) => Promise<void>;

  addRoutine: (input: { memberId: string; title: string; icon: string; color: string }) => Promise<Routine>;
  updateRoutine: (id: string, patch: Partial<Omit<Routine, 'id' | 'familyId'>>) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;

  addTask: (input: { routineId: string; memberId: string; title: string; icon: string; daysOfWeek: Weekday[]; points: number }) => Promise<RoutineTask>;
  updateTask: (id: string, patch: Partial<Omit<RoutineTask, 'id' | 'routineId' | 'memberId'>>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;

  markTaskDone: (taskId: string, date: string) => Promise<void>;
  undoTaskDone: (taskId: string, date: string) => Promise<void>;
  reviewTask: (taskId: string, date: string, status: 'approved' | 'rejected', reviewerId: string) => Promise<void>;
}

type AppDataContextValue = AppDataState & AppDataActions;

const AppDataContext = createContext<AppDataContextValue | null>(null);

const POINTS_ON_APPROVE = true;

function applyChange<T extends { id: string }>(list: T[], eventType: 'INSERT' | 'UPDATE' | 'DELETE', row: T): T[] {
  switch (eventType) {
    case 'INSERT':
      return list.some((x) => x.id === row.id) ? list : [...list, row];
    case 'UPDATE':
      return list.map((x) => (x.id === row.id ? row : x));
    case 'DELETE':
      return list.filter((x) => x.id !== row.id);
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading, session, familyId } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  const myMemberId = useMemo(() => {
    if (mode === 'real') return members.find((m) => m.userId === session?.user.id)?.id ?? null;
    return currentMemberId;
  }, [mode, session, members, currentMemberId]);

  const modeRef = useRef<Mode>(null);
  modeRef.current = mode;
  const routineIdsRef = useRef<Set<string>>(new Set());
  const taskIdsRef = useRef<Set<string>>(new Set());
  routineIdsRef.current = new Set(routines.map((r) => r.id));
  taskIdsRef.current = new Set(tasks.map((t) => t.id));

  // Bulk load: real family data from Supabase once auth resolves a familyId,
  // otherwise fall back to a locally-saved demo family (if any).
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      const cur = await readJSON<string>(StorageKeys.currentMemberId);

      if (session && familyId) {
        const data = await repo.fetchFamilyData(familyId);
        if (cancelled) return;
        setMode('real');
        setFamily(data.family);
        setMembers(data.members);
        setRoutines(data.routines);
        setTasks(data.tasks);
        setCompletions(data.completions);
        setCurrentMemberId(cur && data.members.some((m) => m.id === cur) ? cur : data.members[0]?.id ?? null);
      } else if (!session) {
        const [f, m, r, t, c] = await Promise.all([
          readJSON<Family>(StorageKeys.family),
          readJSON<FamilyMember[]>(StorageKeys.members),
          readJSON<Routine[]>(StorageKeys.routines),
          readJSON<RoutineTask[]>(StorageKeys.tasks),
          readJSON<TaskCompletion[]>(StorageKeys.completions),
        ]);
        if (cancelled) return;
        setMode(f ? 'demo' : null);
        setFamily(f);
        setMembers(m ?? []);
        setRoutines(r ?? []);
        setTasks(t ?? []);
        setCompletions(c ?? []);
        setCurrentMemberId(cur ?? (m && m.length > 0 ? m[0].id : null));
      } else {
        // Signed in but hasn't created/joined a family yet (mid-onboarding).
        setMode(null);
        setFamily(null);
        setMembers([]);
        setRoutines([]);
        setTasks([]);
        setCompletions([]);
        setCurrentMemberId(null);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session, familyId]);

  // Realtime: mirror changes from other devices in the same family.
  useEffect(() => {
    if (mode !== 'real' || !familyId) return;

    const channel = supabase
      .channel(`family-data-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
          setMembers((prev) => applyChange(prev, payload.eventType as any, repo.mapMember(row)));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'routines', filter: `family_id=eq.${familyId}` },
        (payload) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
          setRoutines((prev) => applyChange(prev, payload.eventType as any, repo.mapRoutine(row)));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_tasks' }, (payload) => {
        const row: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (payload.eventType !== 'DELETE' && !routineIdsRef.current.has(row.routine_id)) return;
        if (payload.eventType === 'DELETE' && !taskIdsRef.current.has(row.id)) return;
        setTasks((prev) => applyChange(prev, payload.eventType as any, repo.mapTask(row)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, (payload) => {
        const row: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (payload.eventType !== 'DELETE' && !taskIdsRef.current.has(row.task_id)) return;
        setCompletions((prev) => applyChange(prev, payload.eventType as any, repo.mapCompletion(row)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, familyId]);

  const persistMembers = useCallback(async (next: FamilyMember[]) => {
    setMembers(next);
    if (modeRef.current === 'demo') await writeJSON(StorageKeys.members, next);
  }, []);
  const persistRoutines = useCallback(async (next: Routine[]) => {
    setRoutines(next);
    if (modeRef.current === 'demo') await writeJSON(StorageKeys.routines, next);
  }, []);
  const persistTasks = useCallback(async (next: RoutineTask[]) => {
    setTasks(next);
    if (modeRef.current === 'demo') await writeJSON(StorageKeys.tasks, next);
  }, []);
  const persistCompletions = useCallback(async (next: TaskCompletion[]) => {
    setCompletions(next);
    if (modeRef.current === 'demo') await writeJSON(StorageKeys.completions, next);
  }, []);

  const loadDemoFamily = useCallback(async () => {
    const seed = generateDemoData();
    setMode('demo');
    setFamily(seed.family);
    setMembers(seed.members);
    setRoutines(seed.routines);
    setTasks(seed.tasks);
    setCompletions(seed.completions);
    const firstParent = seed.members.find((m) => m.role === 'parent') ?? seed.members[0];
    setCurrentMemberId(firstParent?.id ?? null);

    await Promise.all([
      writeJSON(StorageKeys.family, seed.family),
      writeJSON(StorageKeys.members, seed.members),
      writeJSON(StorageKeys.routines, seed.routines),
      writeJSON(StorageKeys.tasks, seed.tasks),
      writeJSON(StorageKeys.completions, seed.completions),
      firstParent ? writeJSON(StorageKeys.currentMemberId, firstParent.id) : Promise.resolve(),
    ]);
  }, []);

  const resetDemoData = useCallback(async () => {
    setMode(null);
    setFamily(null);
    setMembers([]);
    setRoutines([]);
    setTasks([]);
    setCompletions([]);
    setCurrentMemberId(null);
    await removeKeys(Object.values(StorageKeys));
  }, []);

  const addMember = useCallback(
    async (input: { name: string; role: Role; color: string; emoji: string }) => {
      if (!family) throw new Error('Cannot add a member before a family exists');
      if (modeRef.current === 'real') {
        const member = await repo.insertMember({ familyId: family.id, ...input });
        setMembers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
        if (!currentMemberId) {
          setCurrentMemberId(member.id);
          await writeJSON(StorageKeys.currentMemberId, member.id);
        }
        return member;
      }
      const member: FamilyMember = { id: generateId('mem'), familyId: family.id, points: 0, ...input };
      const next = [...members, member];
      await persistMembers(next);
      if (!currentMemberId) {
        setCurrentMemberId(member.id);
        await writeJSON(StorageKeys.currentMemberId, member.id);
      }
      return member;
    },
    [family, members, currentMemberId, persistMembers]
  );

  const updateMember = useCallback(
    async (id: string, patch: Partial<Omit<FamilyMember, 'id' | 'familyId'>>) => {
      if (modeRef.current === 'real') {
        await repo.updateMember(id, patch);
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
        return;
      }
      await persistMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [members, persistMembers]
  );

  const removeMember = useCallback(
    async (id: string) => {
      const memberTaskIds = tasks.filter((t) => t.memberId === id).map((t) => t.id);

      if (modeRef.current === 'real') {
        await repo.deleteMember(id); // DB cascades routines/tasks/completions
      }

      await Promise.all([
        persistMembers(members.filter((m) => m.id !== id)),
        persistRoutines(routines.filter((r) => r.memberId !== id)),
        persistTasks(tasks.filter((t) => t.memberId !== id)),
        persistCompletions(completions.filter((c) => !memberTaskIds.includes(c.taskId))),
      ]);

      if (currentMemberId === id) {
        const fallback = members.find((m) => m.id !== id) ?? null;
        setCurrentMemberId(fallback?.id ?? null);
        if (fallback) await writeJSON(StorageKeys.currentMemberId, fallback.id);
        else await removeKeys([StorageKeys.currentMemberId]);
      }
    },
    [members, routines, tasks, completions, currentMemberId, persistMembers, persistRoutines, persistTasks, persistCompletions]
  );

  const setCurrentMember = useCallback(async (id: string) => {
    setCurrentMemberId(id);
    await writeJSON(StorageKeys.currentMemberId, id);
  }, []);

  const addRoutine = useCallback(
    async (input: { memberId: string; title: string; icon: string; color: string }) => {
      if (!family) throw new Error('Cannot add a routine before a family exists');
      if (modeRef.current === 'real') {
        const routine = await repo.insertRoutine({ familyId: family.id, ...input });
        setRoutines((prev) => (prev.some((r) => r.id === routine.id) ? prev : [...prev, routine]));
        return routine;
      }
      const routine: Routine = { id: generateId('rtn'), familyId: family.id, ...input };
      await persistRoutines([...routines, routine]);
      return routine;
    },
    [family, routines, persistRoutines]
  );

  const updateRoutine = useCallback(
    async (id: string, patch: Partial<Omit<Routine, 'id' | 'familyId'>>) => {
      if (modeRef.current === 'real') {
        await repo.updateRoutine(id, patch);
        setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
        return;
      }
      await persistRoutines(routines.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [routines, persistRoutines]
  );

  const removeRoutine = useCallback(
    async (id: string) => {
      const removedTaskIds = tasks.filter((t) => t.routineId === id).map((t) => t.id);

      if (modeRef.current === 'real') {
        await repo.deleteRoutine(id); // DB cascades tasks/completions
      }

      await Promise.all([
        persistRoutines(routines.filter((r) => r.id !== id)),
        persistTasks(tasks.filter((t) => t.routineId !== id)),
        persistCompletions(completions.filter((c) => !removedTaskIds.includes(c.taskId))),
      ]);
    },
    [routines, tasks, completions, persistRoutines, persistTasks, persistCompletions]
  );

  const addTask = useCallback(
    async (input: { routineId: string; memberId: string; title: string; icon: string; daysOfWeek: Weekday[]; points: number }) => {
      if (modeRef.current === 'real') {
        const task = await repo.insertTask(input);
        setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [...prev, task]));
        return task;
      }
      const task: RoutineTask = { id: generateId('tsk'), ...input };
      await persistTasks([...tasks, task]);
      return task;
    },
    [tasks, persistTasks]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Omit<RoutineTask, 'id' | 'routineId' | 'memberId'>>) => {
      if (modeRef.current === 'real') {
        await repo.updateTask(id, patch);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        return;
      }
      await persistTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [tasks, persistTasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      if (modeRef.current === 'real') {
        await repo.deleteTask(id); // DB cascades completions
      }
      await Promise.all([
        persistTasks(tasks.filter((t) => t.id !== id)),
        persistCompletions(completions.filter((c) => c.taskId !== id)),
      ]);
    },
    [tasks, completions, persistTasks, persistCompletions]
  );

  const upsertCompletionLocal = useCallback(
    async (taskId: string, date: string, patch: Partial<TaskCompletion> & { status: CompletionStatus }) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (modeRef.current === 'real') {
        const completion = await repo.upsertCompletion({
          taskId,
          memberId: task.memberId,
          date,
          status: patch.status,
          completedAt: patch.completedAt,
          reviewedBy: patch.reviewedBy,
          reviewedAt: patch.reviewedAt,
        });
        setCompletions((prev) => {
          const existing = findCompletion(prev, taskId, date);
          return existing ? prev.map((c) => (c.id === existing.id ? completion : c)) : [...prev, completion];
        });
        return;
      }

      const existing = findCompletion(completions, taskId, date);
      if (existing) {
        await persistCompletions(completions.map((c) => (c.id === existing.id ? { ...c, ...patch } : c)));
      } else {
        const created: TaskCompletion = { id: generateId('cmp'), taskId, memberId: task.memberId, date, ...patch };
        await persistCompletions([...completions, created]);
      }
    },
    [tasks, completions, persistCompletions]
  );

  const markTaskDone = useCallback(
    async (taskId: string, date: string) => {
      await upsertCompletionLocal(taskId, date, { status: 'done', completedAt: new Date().toISOString(), reviewedBy: undefined, reviewedAt: undefined });
    },
    [upsertCompletionLocal]
  );

  const undoTaskDone = useCallback(
    async (taskId: string, date: string) => {
      const existing = findCompletion(completions, taskId, date);
      if (!existing) return;
      if (modeRef.current === 'real') {
        await repo.deleteCompletion(taskId, date);
      }
      await persistCompletions(completions.filter((c) => c.id !== existing.id));
    },
    [completions, persistCompletions]
  );

  const reviewTask = useCallback(
    async (taskId: string, date: string, status: 'approved' | 'rejected', reviewerId: string) => {
      await upsertCompletionLocal(taskId, date, { status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() });

      if (status === 'approved' && POINTS_ON_APPROVE) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          const member = members.find((m) => m.id === task.memberId);
          if (member) {
            const nextPoints = member.points + task.points;
            if (modeRef.current === 'real') {
              await repo.updateMemberPoints(member.id, nextPoints);
              setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, points: nextPoints } : m)));
            } else {
              await persistMembers(members.map((m) => (m.id === task.memberId ? { ...m, points: nextPoints } : m)));
            }
          }
        }
      }
    },
    [upsertCompletionLocal, tasks, members, persistMembers]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      isLoading,
      family,
      members,
      routines,
      tasks,
      completions,
      currentMemberId,
      myMemberId,
      isDemoMode: mode === 'demo',
      loadDemoFamily,
      resetDemoData,
      addMember,
      updateMember,
      removeMember,
      setCurrentMember,
      addRoutine,
      updateRoutine,
      removeRoutine,
      addTask,
      updateTask,
      removeTask,
      markTaskDone,
      undoTaskDone,
      reviewTask,
    }),
    [
      isLoading,
      family,
      members,
      routines,
      tasks,
      completions,
      currentMemberId,
      myMemberId,
      mode,
      loadDemoFamily,
      resetDemoData,
      addMember,
      updateMember,
      removeMember,
      setCurrentMember,
      addRoutine,
      updateRoutine,
      removeRoutine,
      addTask,
      updateTask,
      removeTask,
      markTaskDone,
      undoTaskDone,
      reviewTask,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within an AppDataProvider');
  return ctx;
}

export function useCurrentMember(): FamilyMember | null {
  const { members, currentMemberId } = useAppData();
  return members.find((m) => m.id === currentMemberId) ?? null;
}

/** The signed-in user's own family member — use this (not useCurrentMember) for any parent-only permission check. */
export function useMyMember(): FamilyMember | null {
  const { members, myMemberId } = useAppData();
  return members.find((m) => m.id === myMemberId) ?? null;
}

export function useToday(): string {
  return dateKey();
}
