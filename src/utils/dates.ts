import {
  format,
  parseISO,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  differenceInCalendarDays,
} from 'date-fns';

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

/** One month of a calendar grid: its heading, and the days it actually shows. */
export interface MonthGrid {
  /** "August 2026" */
  label: string;
  /**
   * Blank cells to place before the first day, so it lands under its own
   * weekday column (Sunday first, matching DAY_LABELS_SHORT).
   */
  lead: number;
  days: Date[];
}

/**
 * A run of dates broken into one grid per month, for a calendar that is read
 * rather than navigated.
 *
 * Two rules, both of them about not showing empty space:
 *
 *  - A month is its own grid, so no row ever carries the end of one month and
 *    the start of the next, where the day numbers restart mid-row.
 *  - Only the days inside the range are laid out. A term opening on the 8th
 *    opens its grid on the 8th, and one ending on the 3rd stops there, rather
 *    than padding the month out with invisible cells that read as a blank week.
 *
 * The weekday columns still line up, because the offset is taken from the first
 * day actually shown rather than from the 1st of the month.
 */
export function monthGrids(startKey: string, endKey: string): MonthGrid[] {
  if (endKey < startKey) return [];
  // A term this long is a mistyped year rather than a term, and drawing it a
  // month at a time would lock the page up. See MAX_TERM_DAYS in calculations.
  if (differenceInCalendarDays(fromDateKey(endKey), fromDateKey(startKey)) > 3660) {
    return [];
  }

  const grids: MonthGrid[] = [];
  const lastMonth = startOfMonth(fromDateKey(endKey));

  for (
    let month = startOfMonth(fromDateKey(startKey));
    month <= lastMonth;
    month = addMonths(month, 1)
  ) {
    const days = eachDayOfInterval({
      start: month,
      end: endOfMonth(month),
    }).filter((day) => {
      const key = toDateKey(day);
      return key >= startKey && key <= endKey;
    });

    // Defensive: with the loop bounds above, every month holds at least a day.
    if (days.length === 0) continue;

    grids.push({
      label: formatMonthLabel(month),
      lead: getDay(days[0]),
      days,
    });
  }

  return grids;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}
