export type Role = 'parent' | 'kid';

export interface Family {
  id: string;
  name: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  /** Supabase auth.users id this member is bound to, if any (unset until claimed for 'real' families) */
  userId?: string;
  name: string;
  role: Role;
  color: string;
  emoji: string;
  points: number;
}

/** 0 = Sunday ... 6 = Saturday, matching Date#getDay() */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface Routine {
  id: string;
  familyId: string;
  memberId: string;
  title: string;
  icon: string;
  color: string;
}

export interface RoutineTask {
  id: string;
  routineId: string;
  memberId: string;
  title: string;
  icon: string;
  daysOfWeek: Weekday[];
  points: number;
}

export type CompletionStatus = 'pending' | 'done' | 'approved' | 'rejected';

export interface TaskCompletion {
  id: string;
  taskId: string;
  memberId: string;
  /** YYYY-MM-DD, local calendar date this completion applies to */
  date: string;
  status: CompletionStatus;
  completedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
