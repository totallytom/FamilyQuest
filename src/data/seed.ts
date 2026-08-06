import type { Family, FamilyMember, Routine, RoutineTask, TaskCompletion, Weekday } from '@/types/models';
import { generateId } from '@/utils/id';
import { addDays, dateKey, weekdayOf } from '@/utils/date';

const DAILY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const SCHOOL_DAYS: Weekday[] = [1, 2, 3, 4, 5];
const MWF: Weekday[] = [1, 3, 5];

export interface SeedResult {
  family: Family;
  members: FamilyMember[];
  routines: Routine[];
  tasks: RoutineTask[];
  completions: TaskCompletion[];
}

export function generateDemoData(): SeedResult {
  const familyId = generateId('fam');
  const family: Family = { id: familyId, name: 'The Rivera Family', createdAt: new Date().toISOString() };

  const mom: FamilyMember = { id: generateId('mem'), familyId, name: 'Sofia', role: 'parent', color: '#8B6BE0', emoji: '🌟', points: 0 };
  const dad: FamilyMember = { id: generateId('mem'), familyId, name: 'Marcus', role: 'parent', color: '#5B9DFF', emoji: '🦉', points: 0 };
  const mia: FamilyMember = { id: generateId('mem'), familyId, name: 'Mia', role: 'kid', color: '#FF8A5B', emoji: '🦊', points: 40 };
  const leo: FamilyMember = { id: generateId('mem'), familyId, name: 'Leo', role: 'kid', color: '#3DBFAE', emoji: '🐸', points: 25 };
  const members = [mom, dad, mia, leo];

  const routines: Routine[] = [
    { id: generateId('rtn'), familyId, memberId: mia.id, title: 'Morning Routine', icon: 'sunny', color: '#FFC94A' },
    { id: generateId('rtn'), familyId, memberId: mia.id, title: 'Homework', icon: 'book', color: '#5B9DFF' },
    { id: generateId('rtn'), familyId, memberId: mia.id, title: 'Evening Chores', icon: 'moon', color: '#8B6BE0' },
    { id: generateId('rtn'), familyId, memberId: leo.id, title: 'Morning Routine', icon: 'sunny', color: '#FFC94A' },
    { id: generateId('rtn'), familyId, memberId: leo.id, title: 'Homework', icon: 'book', color: '#5B9DFF' },
  ];
  const [miaMorning, miaHomework, miaChores, leoMorning, leoHomework] = routines;

  const tasks: RoutineTask[] = [
    { id: generateId('tsk'), routineId: miaMorning.id, memberId: mia.id, title: 'Make bed', icon: 'bed', daysOfWeek: DAILY, points: 5 },
    { id: generateId('tsk'), routineId: miaMorning.id, memberId: mia.id, title: 'Brush teeth', icon: 'happy', daysOfWeek: DAILY, points: 5 },
    { id: generateId('tsk'), routineId: miaHomework.id, memberId: mia.id, title: 'Read for 20 minutes', icon: 'book', daysOfWeek: SCHOOL_DAYS, points: 10 },
    { id: generateId('tsk'), routineId: miaHomework.id, memberId: mia.id, title: 'Math worksheet', icon: 'calculator', daysOfWeek: MWF, points: 10 },
    { id: generateId('tsk'), routineId: miaChores.id, memberId: mia.id, title: 'Feed the fish', icon: 'fish', daysOfWeek: DAILY, points: 5 },
    { id: generateId('tsk'), routineId: miaChores.id, memberId: mia.id, title: 'Tidy bedroom', icon: 'home', daysOfWeek: DAILY, points: 10 },

    { id: generateId('tsk'), routineId: leoMorning.id, memberId: leo.id, title: 'Get dressed', icon: 'shirt', daysOfWeek: DAILY, points: 5 },
    { id: generateId('tsk'), routineId: leoMorning.id, memberId: leo.id, title: 'Brush teeth', icon: 'happy', daysOfWeek: DAILY, points: 5 },
    { id: generateId('tsk'), routineId: leoHomework.id, memberId: leo.id, title: 'Spelling practice', icon: 'pencil', daysOfWeek: SCHOOL_DAYS, points: 10 },
  ];

  const today = dateKey();
  const yesterday = addDays(today, -1);

  const completions: TaskCompletion[] = [
    // Mia — mostly on top of things today, one still waiting on a parent check
    { id: generateId('cmp'), taskId: tasks[0].id, memberId: mia.id, date: today, status: 'approved', completedAt: new Date().toISOString(), reviewedBy: mom.id, reviewedAt: new Date().toISOString() },
    { id: generateId('cmp'), taskId: tasks[1].id, memberId: mia.id, date: today, status: 'approved', completedAt: new Date().toISOString(), reviewedBy: mom.id, reviewedAt: new Date().toISOString() },
    { id: generateId('cmp'), taskId: tasks[2].id, memberId: mia.id, date: today, status: 'done', completedAt: new Date().toISOString() },

    // Leo — just getting started today
    { id: generateId('cmp'), taskId: tasks[6].id, memberId: leo.id, date: today, status: 'approved', completedAt: new Date().toISOString(), reviewedBy: dad.id, reviewedAt: new Date().toISOString() },

    // Yesterday, fully wrapped up for both kids so streaks have something to show
    ...tasksWithDaysIncluding(tasks, mia.id, yesterday).map((t) => completionFor(t, mia.id, yesterday, mom.id)),
    ...tasksWithDaysIncluding(tasks, leo.id, yesterday).map((t) => completionFor(t, leo.id, yesterday, dad.id)),
  ];

  return { family, members, routines, tasks, completions };
}

function tasksWithDaysIncluding(tasks: RoutineTask[], memberId: string, dateStr: string): RoutineTask[] {
  const weekday = weekdayOf(dateStr);
  return tasks.filter((t) => t.memberId === memberId && t.daysOfWeek.includes(weekday));
}

function completionFor(task: RoutineTask, memberId: string, dateStr: string, reviewerId: string): TaskCompletion {
  return {
    id: generateId('cmp'),
    taskId: task.id,
    memberId,
    date: dateStr,
    status: 'approved',
    completedAt: new Date(`${dateStr}T08:00:00`).toISOString(),
    reviewedBy: reviewerId,
    reviewedAt: new Date(`${dateStr}T18:00:00`).toISOString(),
  };
}
