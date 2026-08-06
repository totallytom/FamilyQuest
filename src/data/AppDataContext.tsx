import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

interface AppDataState {
  isLoading: boolean;
  family: Family | null;
  members: FamilyMember[];
  routines: Routine[];
  tasks: RoutineTask[];
  completions: TaskCompletion[];
  currentMemberId: string | null;
}

interface AppDataActions {
  createFamily: (name: string) => Promise<Family>;
  loadDemoFamily: () => Promise<void>;
  resetAllData: () => Promise<void>;

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

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [f, m, r, t, c, cur] = await Promise.all([
        readJSON<Family>(StorageKeys.family),
        readJSON<FamilyMember[]>(StorageKeys.members),
        readJSON<Routine[]>(StorageKeys.routines),
        readJSON<RoutineTask[]>(StorageKeys.tasks),
        readJSON<TaskCompletion[]>(StorageKeys.completions),
        readJSON<string>(StorageKeys.currentMemberId),
      ]);
      setFamily(f);
      setMembers(m ?? []);
      setRoutines(r ?? []);
      setTasks(t ?? []);
      setCompletions(c ?? []);
      setCurrentMemberId(cur ?? (m && m.length > 0 ? m[0].id : null));
      setIsLoading(false);
    })();
  }, []);

  const persistMembers = useCallback(async (next: FamilyMember[]) => {
    setMembers(next);
    await writeJSON(StorageKeys.members, next);
  }, []);
  const persistRoutines = useCallback(async (next: Routine[]) => {
    setRoutines(next);
    await writeJSON(StorageKeys.routines, next);
  }, []);
  const persistTasks = useCallback(async (next: RoutineTask[]) => {
    setTasks(next);
    await writeJSON(StorageKeys.tasks, next);
  }, []);
  const persistCompletions = useCallback(async (next: TaskCompletion[]) => {
    setCompletions(next);
    await writeJSON(StorageKeys.completions, next);
  }, []);

  const createFamily = useCallback(async (name: string) => {
    const newFamily: Family = { id: generateId('fam'), name, createdAt: new Date().toISOString() };
    setFamily(newFamily);
    await writeJSON(StorageKeys.family, newFamily);
    return newFamily;
  }, []);

  const loadDemoFamily = useCallback(async () => {
    const seed = generateDemoData();
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

  const resetAllData = useCallback(async () => {
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
      await persistMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [members, persistMembers]
  );

  const removeMember = useCallback(
    async (id: string) => {
      const memberRoutineIds = routines.filter((r) => r.memberId === id).map((r) => r.id);
      const memberTaskIds = tasks.filter((t) => t.memberId === id).map((t) => t.id);

      await Promise.all([
        persistMembers(members.filter((m) => m.id !== id)),
        persistRoutines(routines.filter((r) => r.memberId !== id)),
        persistTasks(tasks.filter((t) => t.memberId !== id)),
        persistCompletions(completions.filter((c) => !memberTaskIds.includes(c.taskId))),
      ]);
      void memberRoutineIds;

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
      const routine: Routine = { id: generateId('rtn'), familyId: family.id, ...input };
      await persistRoutines([...routines, routine]);
      return routine;
    },
    [family, routines, persistRoutines]
  );

  const updateRoutine = useCallback(
    async (id: string, patch: Partial<Omit<Routine, 'id' | 'familyId'>>) => {
      await persistRoutines(routines.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [routines, persistRoutines]
  );

  const removeRoutine = useCallback(
    async (id: string) => {
      const removedTaskIds = tasks.filter((t) => t.routineId === id).map((t) => t.id);
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
      const task: RoutineTask = { id: generateId('tsk'), ...input };
      await persistTasks([...tasks, task]);
      return task;
    },
    [tasks, persistTasks]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Omit<RoutineTask, 'id' | 'routineId' | 'memberId'>>) => {
      await persistTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [tasks, persistTasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      await Promise.all([
        persistTasks(tasks.filter((t) => t.id !== id)),
        persistCompletions(completions.filter((c) => c.taskId !== id)),
      ]);
    },
    [tasks, completions, persistTasks, persistCompletions]
  );

  const upsertCompletion = useCallback(
    async (taskId: string, date: string, patch: Partial<TaskCompletion> & { status: CompletionStatus }) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const existing = findCompletion(completions, taskId, date);
      if (existing) {
        await persistCompletions(
          completions.map((c) => (c.id === existing.id ? { ...c, ...patch } : c))
        );
      } else {
        const created: TaskCompletion = {
          id: generateId('cmp'),
          taskId,
          memberId: task.memberId,
          date,
          ...patch,
        };
        await persistCompletions([...completions, created]);
      }
    },
    [tasks, completions, persistCompletions]
  );

  const markTaskDone = useCallback(
    async (taskId: string, date: string) => {
      await upsertCompletion(taskId, date, { status: 'done', completedAt: new Date().toISOString(), reviewedBy: undefined, reviewedAt: undefined });
    },
    [upsertCompletion]
  );

  const undoTaskDone = useCallback(
    async (taskId: string, date: string) => {
      const existing = findCompletion(completions, taskId, date);
      if (!existing) return;
      await persistCompletions(completions.filter((c) => c.id !== existing.id));
    },
    [completions, persistCompletions]
  );

  const reviewTask = useCallback(
    async (taskId: string, date: string, status: 'approved' | 'rejected', reviewerId: string) => {
      await upsertCompletion(taskId, date, { status, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() });

      if (status === 'approved' && POINTS_ON_APPROVE) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          await persistMembers(
            members.map((m) => (m.id === task.memberId ? { ...m, points: m.points + task.points } : m))
          );
        }
      }
    },
    [upsertCompletion, tasks, members, persistMembers]
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
      createFamily,
      loadDemoFamily,
      resetAllData,
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
      createFamily,
      loadDemoFamily,
      resetAllData,
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

export function useToday(): string {
  return dateKey();
}
