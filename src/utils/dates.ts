import { format, parseISO } from 'date-fns';

/** Convert a Date to a stable 'YYYY-MM-DD' string (local time). */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parse a 'YYYY-MM-DD' string into a local Date (midnight). */
export function fromDateKey(key: string): Date {
  // parseISO on a date-only string yields local midnight, which is what we want.
  return parseISO(key);
}

/** "Mon, 12 Aug" */
export function formatSessionDate(key: string): string {
  return format(fromDateKey(key), 'EEE, d MMM');
}

/** "12 August 2025" */
export function formatLongDate(key: string): string {
  return format(fromDateKey(key), 'd MMMM yyyy');
}

/** "August 2025" month grouping label */
export function formatMonthLabel(date: Date): string {
  return format(date, 'MMMM yyyy');
}

/** Day-of-week short labels, indexed 0 (Sun) .. 6 (Sat). */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Day toggle order shown in the UI: Mon .. Sun. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function todayKey(): string {
  return toDateKey(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}
