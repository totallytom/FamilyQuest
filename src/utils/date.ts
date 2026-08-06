import type { Weekday } from '@/types/models';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for a given Date (defaults to now). Avoids UTC-shift bugs from toISOString. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekdayOf(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() as Weekday;
}

export function friendlyDate(dateStr: string): string {
  const today = dateKey();
  if (dateStr === today) return 'Today';

  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(yesterday) === dateStr) return 'Yesterday';

  return target.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dateKey(dt);
}
