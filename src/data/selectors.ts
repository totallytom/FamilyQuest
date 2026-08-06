import type { RoutineTask, TaskCompletion } from '@/types/models';
import { addDays, dateKey, weekdayOf } from '@/utils/date';

export function isTaskActiveOnDate(task: RoutineTask, dateStr: string): boolean {
  return task.daysOfWeek.includes(weekdayOf(dateStr));
}

export function tasksForMemberOnDate(
  tasks: RoutineTask[],
  memberId: string,
  dateStr: string
): RoutineTask[] {
  return tasks.filter((t) => t.memberId === memberId && isTaskActiveOnDate(t, dateStr));
}

export function findCompletion(
  completions: TaskCompletion[],
  taskId: string,
  dateStr: string
): TaskCompletion | undefined {
  return completions.find((c) => c.taskId === taskId && c.date === dateStr);
}

export interface DayStats {
  total: number;
  approved: number;
  waitingReview: number;
  pending: number;
  rejected: number;
}

export function memberDayStats(
  tasks: RoutineTask[],
  completions: TaskCompletion[],
  memberId: string,
  dateStr: string
): DayStats {
  const dayTasks = tasksForMemberOnDate(tasks, memberId, dateStr);
  const stats: DayStats = { total: dayTasks.length, approved: 0, waitingReview: 0, pending: 0, rejected: 0 };

  for (const task of dayTasks) {
    const completion = findCompletion(completions, task.id, dateStr);
    switch (completion?.status) {
      case 'approved':
        stats.approved += 1;
        break;
      case 'done':
        stats.waitingReview += 1;
        break;
      case 'rejected':
        stats.rejected += 1;
        break;
      default:
        stats.pending += 1;
    }
  }
  return stats;
}

/** Consecutive days (walking backwards from today) where every scheduled task was approved. */
export function memberStreak(
  tasks: RoutineTask[],
  completions: TaskCompletion[],
  memberId: string
): number {
  let streak = 0;
  let cursor = dateKey();

  // Today doesn't break the streak just for being incomplete-so-far; it only adds to it once finished.
  const todayStats = memberDayStats(tasks, completions, memberId, cursor);
  if (todayStats.total > 0 && todayStats.approved === todayStats.total) {
    streak += 1;
  }
  cursor = addDays(cursor, -1);

  for (let i = 0; i < 365; i += 1) {
    const stats = memberDayStats(tasks, completions, memberId, cursor);
    if (stats.total === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (stats.approved === stats.total) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}
