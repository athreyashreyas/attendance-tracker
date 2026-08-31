import { addDays, format } from 'date-fns';
import { normalizeCount } from './slots';
import { DAY_LABELS, WEEK_ORDER, fromDateKey, toDateKey } from '../utils/dates';
import type { ClassesPerDay, ScheduleDay, SchedulePeriod } from '../types';

/**
 * A timetable is not one thing for the whole term. The department moves the
 * Wednesday lecture to Thursday in week six; a lab swaps its slot after the
 * mid-term; a class that met twice a week starts meeting three times. What ran
 * before the change still ran, and the term's record has to keep saying so.
 *
 * So a class carries a timeline rather than a schedule: an opening timetable,
 * then one entry for each date the days moved. Every question about a date
 * ("does this class meet?", "how many times?") is answered by the timetable in
 * force on that date, which is what keeps last month's calendar showing last
 * month's schedule while this month follows the new one.
 *
 * Two things keep it honest:
 *
 *  - The opening entry carries no date. It covers everything up to the first
 *    change, however far back the class goes, so no date is ever unaccounted
 *    for.
 *  - `course.schedule_days` / `course.sessions_per_day` stay in step with the
 *    newest entry. They are the mirror an older build of the app reads, and
 *    the one it writes to; see schedulePeriods for what happens when it does.
 *
 * Everything here tolerates a class saved before any of this existed: no
 * timeline at all reads as a single timetable that has always been in force,
 * which is exactly what such a class is.
 */

/**
 * Changes one class can carry. Well past any real term, and low enough that a
 * timeline stays readable in one glance and cheap to walk on every date.
 */
export const MAX_SCHEDULE_CHANGES = 12;

/** What the timeline can be read from: a course, or a course being edited. */
export interface ScheduleSource {
  schedule_days?: ScheduleDay[];
  sessions_per_day?: ClassesPerDay;
  schedule_history?: SchedulePeriod[];
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** A real 'YYYY-MM-DD', which is what a half-typed date in a form is not. */
export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY.test(value);
}

/** Valid weekdays only, each once, in week order. */
function tidyDays(days: unknown): ScheduleDay[] {
  if (!Array.isArray(days)) return [];
  const seen = new Set<ScheduleDay>();
  for (const day of days) {
    const n = Math.floor(Number(day));
    if (Number.isFinite(n) && n >= 0 && n <= 6) seen.add(n as ScheduleDay);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Keep only the days that genuinely meet more than once, and only days the
 * class actually runs on. A day dropped from the schedule shouldn't leave a
 * count behind to surprise anyone who adds it back later.
 */
export function tidyPerDay(
  perDay: ClassesPerDay | undefined,
  days: ScheduleDay[]
): ClassesPerDay {
  const out: ClassesPerDay = {};
  for (const day of days) {
    const count = normalizeCount(perDay?.[day] ?? 1);
    if (count > 1) out[day] = count;
  }
  return out;
}

/** One timetable, cleaned up: valid days, tidy counts, a real date or none. */
export function makePeriod(
  days: ScheduleDay[] | undefined,
  perDay: ClassesPerDay | undefined = {},
  effectiveFrom: string | null = null
): SchedulePeriod {
  const clean = tidyDays(days);
  return {
    effective_from: isDateKey(effectiveFrom) ? effectiveFrom : null,
    days: clean,
    sessions_per_day: tidyPerDay(perDay, clean),
  };
}

/** The same days meeting the same number of times, whatever their dates. */
export function periodsEqual(a: SchedulePeriod, b: SchedulePeriod): boolean {
  if (a.days.length !== b.days.length) return false;
  if (a.days.some((day, i) => day !== b.days[i])) return false;
  for (const day of a.days) {
    const left = normalizeCount(a.sessions_per_day?.[day] ?? 1);
    const right = normalizeCount(b.sessions_per_day?.[day] ?? 1);
    if (left !== right) return false;
  }
  return true;
}

/** True when two timelines would produce different classes on some date. */
export function timelinesDiffer(
  a: SchedulePeriod[],
  b: SchedulePeriod[]
): boolean {
  const left = normalizePeriods(a);
  const right = normalizePeriods(b);
  if (left.length !== right.length) return true;
  return left.some(
    (period, i) =>
      period.effective_from !== right[i].effective_from ||
      !periodsEqual(period, right[i])
  );
}

/**
 * A timeline in the shape everything else here assumes: oldest first, the
 * opening entry dateless, one entry per date, and no entry that changes
 * nothing.
 *
 * It is deliberately forgiving, because this data arrives from other devices
 * and from older builds as well as from the form: anything unreadable, and
 * anything holding no days, is dropped rather than believed. An empty result
 * means "no timeline", and the caller falls back to the mirror.
 */
export function normalizePeriods(
  periods: SchedulePeriod[] | undefined | null
): SchedulePeriod[] {
  if (!Array.isArray(periods) || periods.length === 0) return [];

  let opening: SchedulePeriod | null = null;
  // Two changes on the same date can only mean one survived, and it is the
  // one written later.
  const byDate = new Map<string, SchedulePeriod>();
  for (const raw of periods) {
    if (!raw) continue;
    const period = makePeriod(raw.days, raw.sessions_per_day, raw.effective_from);
    // A timetable with no days is not a timetable. A class that stops meeting
    // says so with its last date, and dropping these here means a stray entry
    // can never take the place of a real one.
    if (period.days.length === 0) continue;
    if (period.effective_from === null) opening ??= period;
    else byDate.set(period.effective_from, period);
  }

  const changes = [...byDate.values()].sort((a, b) =>
    (a.effective_from as string).localeCompare(b.effective_from as string)
  );

  // With no opening entry the earliest change becomes one, so that the dates
  // before it still have a timetable rather than falling through a hole.
  const ordered = opening
    ? [opening, ...changes]
    : changes.map((period, i) =>
        i === 0 ? { ...period, effective_from: null } : period
      );

  const out: SchedulePeriod[] = [];
  for (const period of ordered) {
    const previous = out[out.length - 1];
    // A "change" to the same days is not a change. Dropping it keeps the
    // timeline a record of what actually moved.
    if (previous && periodsEqual(previous, period)) continue;
    out.push(period);
  }
  return out;
}

/**
 * A class's timetable over time.
 *
 * The reconciliation in the middle is the cross-version case. An older build
 * knows only `schedule_days`, so a class edited there comes back carrying a
 * timetable its own timeline has never heard of. Taking it as a correction of
 * the newest entry keeps that edit, and keeps every change date and everything
 * before it exactly as it was. Ignoring the mirror instead would silently undo
 * a change the user made on their other device.
 */
export function schedulePeriods(course: ScheduleSource): SchedulePeriod[] {
  const history = normalizePeriods(course.schedule_history);
  const mirror = makePeriod(course.schedule_days, course.sessions_per_day);
  if (history.length === 0) return [mirror];

  const newest = history[history.length - 1];
  // An empty mirror is a class saved before the mirror was written, not a
  // class with no days: the form has never allowed one without a day.
  if (mirror.days.length === 0 || periodsEqual(mirror, newest)) return history;

  const corrected = [...history];
  corrected[corrected.length - 1] = {
    ...newest,
    days: mirror.days,
    sessions_per_day: mirror.sessions_per_day,
  };
  return normalizePeriods(corrected);
}

/** True once a class has a change on its timeline, rather than one timetable. */
export function hasScheduleChanges(course: ScheduleSource): boolean {
  return schedulePeriods(course).length > 1;
}

/** The timetable in force on a date. Never null: some entry always covers it. */
export function periodOn(
  periods: SchedulePeriod[],
  dateKey: string
): SchedulePeriod {
  let opening: SchedulePeriod | null = null;
  let earliest: SchedulePeriod | null = null;
  let best: SchedulePeriod | null = null;
  for (const period of periods) {
    if (period.effective_from === null) {
      opening ??= period;
      continue;
    }
    if (!earliest || period.effective_from < (earliest.effective_from as string)) {
      earliest = period;
    }
    if (
      period.effective_from <= dateKey &&
      (!best || period.effective_from > (best.effective_from as string))
    ) {
      best = period;
    }
  }
  // Before the first change, the opening timetable holds. A timeline that has
  // lost its opening entry falls back to its earliest, which normalization
  // would have promoted anyway.
  return best ?? opening ?? earliest ?? makePeriod([]);
}

/**
 * Where the timetable in force on a date sits on the timeline, so a caller
 * holding the list can edit that entry. Returns 0 for a timeline with nothing
 * before the date, which is the opening timetable's place.
 */
export function indexOfPeriodOn(
  periods: SchedulePeriod[],
  dateKey: string
): number {
  const period = periodOn(periods, dateKey);
  const at = periods.indexOf(period);
  return at >= 0 ? at : 0;
}

/** The timetable this class ran on a given date. */
export function scheduleOn(
  course: ScheduleSource,
  dateKey: string
): SchedulePeriod {
  return periodOn(schedulePeriods(course), dateKey);
}

/**
 * How many classes a timetable holds on a weekday: 0 when it doesn't meet that
 * day at all. Days off aren't considered here, since they belong to the class
 * rather than to one of its timetables. See classesOnDate.
 */
export function classesOnWeekdayIn(
  period: SchedulePeriod,
  day: ScheduleDay
): number {
  if (!period.days.includes(day)) return 0;
  return normalizeCount(period.sessions_per_day?.[day] ?? 1);
}

/** How many classes a timeline holds on a date, days off aside. */
export function classesOnDateIn(
  periods: SchedulePeriod[],
  dateKey: string
): number {
  const day = fromDateKey(dateKey).getDay() as ScheduleDay;
  return classesOnWeekdayIn(periodOn(periods, dateKey), day);
}

/**
 * Whether a timeline holds a particular class of a particular day. Takes the
 * parts rather than a course, so the class form can ask it of the timeline
 * being edited, before anything is saved.
 */
export function timetableHoldsClass(
  periods: SchedulePeriod[],
  excluded: string[],
  dateKey: string,
  slot: number
): boolean {
  if (excluded.includes(dateKey)) return false;
  return slot <= classesOnDateIn(periods, dateKey);
}

/** A timetable with the run of dates it covers, for reading back. */
export interface ScheduleSpan {
  period: SchedulePeriod;
  /** First day it applies. Null when the class has no start date. */
  start: string | null;
  /** Last day it applies. Null when nothing after it ends it. */
  end: string | null;
  /** Its place on the timeline, so a caller can edit the entry it came from. */
  index: number;
}

/** The day before a date key, for ending a span where the next one starts. */
export function previousDay(dateKey: string): string {
  return toDateKey(addDays(fromDateKey(dateKey), -1));
}

/**
 * The day after a date key. The earliest a change can start is the day after
 * the stretch it splits begins: a change on that stretch's own first day would
 * leave it covering nothing, and is a correction rather than a change.
 */
export function nextDay(dateKey: string): string {
  return toDateKey(addDays(fromDateKey(dateKey), 1));
}

/**
 * The timeline as spans of dates, which is how it reads: "Mon and Wed until 14
 * September, Tue and Thu from the 15th". Clamped to the class's own window
 * when it has one, so a span never claims dates the class doesn't run.
 *
 * The entries are only put in order, never merged away: a caller showing this
 * as a list needs each span's index to point back at the entry it came from,
 * and a form's half-finished timeline is exactly where a row would otherwise
 * vanish under the user's hands. Give it a normalized timeline for a reading
 * of the record; give it the one being edited to show what is being edited.
 */
export function scheduleSpans(
  periods: SchedulePeriod[],
  windowStart: string | null = null,
  windowEnd: string | null = null
): ScheduleSpan[] {
  const ordered = sortPeriods(periods);
  return ordered.map((period, i) => {
    const next = ordered[i + 1];
    let start = period.effective_from ?? windowStart;
    let end = next?.effective_from ? previousDay(next.effective_from) : windowEnd;
    if (windowStart && (!start || start < windowStart)) start = windowStart;
    if (windowEnd && (!end || end > windowEnd)) end = windowEnd;
    return { period, start, end, index: i };
  });
}

/**
 * A span that covers no date at all: a change dated after the last class, or
 * one immediately replaced by another on the same day. Worth saying out loud
 * in the form rather than showing a row that quietly means nothing.
 */
export function spanIsEmpty(span: ScheduleSpan): boolean {
  return !!span.start && !!span.end && span.end < span.start;
}

/** "Mon, Wed and Fri", with the doubles named: "Mon and Tue ×2". */
export function formatDays(period: SchedulePeriod): string {
  const parts = WEEK_ORDER.filter((day) => period.days.includes(day)).map(
    (day) => {
      const count = normalizeCount(period.sessions_per_day?.[day] ?? 1);
      return count > 1 ? `${DAY_LABELS[day]} ×${count}` : DAY_LABELS[day];
    }
  );
  if (parts.length === 0) return 'No class days';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "12 Aug", the short form the timeline rows read in. */
function shortDate(dateKey: string): string {
  return format(fromDateKey(dateKey), 'd MMM');
}

/** "Until 14 Sep", "From 15 Sep", "15 Sep to 20 Oct", "The whole term". */
export function formatSpan(span: ScheduleSpan): string {
  const { start, end } = span;
  if (span.index === 0 && !end) return 'The whole term';
  if (span.index === 0) return `Until ${shortDate(end as string)}`;
  if (!end) return `From ${shortDate(start as string)}`;
  if (!start) return `Until ${shortDate(end)}`;
  return `${shortDate(start)} to ${shortDate(end)}`;
}

/**
 * Record that the timetable changed on a date: everything before it keeps the
 * timetable it ran on, everything from it on takes the new days.
 *
 * Changing the timetable on a date the class already has a change for replaces
 * that change rather than stacking a second one on the same day.
 */
export function addScheduleChange(
  periods: SchedulePeriod[],
  fromKey: string,
  days: ScheduleDay[],
  perDay: ClassesPerDay
): SchedulePeriod[] {
  const kept = periods.filter((p) => p.effective_from !== fromKey);
  return sortPeriods([...kept, makePeriod(days, perDay, fromKey)]);
}

/**
 * The timeline that "the timetable changed on this date" produces, given the
 * entry that was edited and what it held before the edit.
 *
 * The edited stretch goes back to what it was, and the new days start on their
 * own date. That is the whole difference between a change and a correction: a
 * correction leaves the edit where it is, and this moves it to a date and hands
 * the weeks before that back to the timetable they actually ran on.
 */
export function applyScheduleChange(
  periods: SchedulePeriod[],
  index: number,
  restoreTo: SchedulePeriod | null,
  fromKey: string
): SchedulePeriod[] {
  const edited = periods[index] ?? makePeriod([]);
  const restored = restoreTo
    ? editPeriod(periods, index, restoreTo.days, restoreTo.sessions_per_day)
    : periods;
  return addScheduleChange(
    restored,
    fromKey,
    edited.days,
    edited.sessions_per_day
  );
}

/**
 * Undo one change: the dates it covered fall back to the timetable that ran
 * before it. The opening timetable can't be removed, since something has to
 * cover the start of the term.
 */
export function removeScheduleChange(
  periods: SchedulePeriod[],
  index: number
): SchedulePeriod[] {
  if (index <= 0 || index >= periods.length) return periods;
  return periods.filter((_, i) => i !== index);
}

/** Set one entry's days, leaving the date it took over alone. */
export function editPeriod(
  periods: SchedulePeriod[],
  index: number,
  days: ScheduleDay[],
  perDay: ClassesPerDay
): SchedulePeriod[] {
  if (index < 0 || index >= periods.length) return periods;
  return periods.map((period, i) =>
    i === index
      ? makePeriod(days, perDay, period.effective_from)
      : period
  );
}

/** Move a change to a different date, keeping the timeline in order. */
export function moveScheduleChange(
  periods: SchedulePeriod[],
  index: number,
  fromKey: string
): SchedulePeriod[] {
  if (index <= 0 || index >= periods.length) return periods;
  const moved = periods.map((period, i) =>
    i === index ? makePeriod(period.days, period.sessions_per_day, fromKey) : period
  );
  return sortPeriods(moved);
}

/** Oldest first, the dateless opening entry always at the front. */
export function sortPeriods(periods: SchedulePeriod[]): SchedulePeriod[] {
  return [...periods].sort((a, b) => {
    if (a.effective_from === null) return b.effective_from === null ? 0 : -1;
    if (b.effective_from === null) return 1;
    return a.effective_from.localeCompare(b.effective_from);
  });
}

/**
 * What a class's mirror columns should say, given its timeline: the newest
 * timetable, which is the one an older build of the app should show.
 */
export function mirrorOf(periods: SchedulePeriod[]): SchedulePeriod {
  const ordered = normalizePeriods(periods);
  return ordered[ordered.length - 1] ?? makePeriod([]);
}

/** The three columns a class's schedule is stored in. */
export interface ScheduleFields {
  schedule_days: ScheduleDay[];
  sessions_per_day: ClassesPerDay;
  schedule_history: SchedulePeriod[];
}

/**
 * What a save should write for a class's schedule, from whatever the caller
 * has: a timeline, or a single timetable that is then the whole of it.
 *
 * Two rules, and every write goes through them so the stored shape is the one
 * the readers assume:
 *
 *  - The mirror is the newest timetable, always.
 *  - A class whose days have never changed keeps an empty timeline, so nothing
 *    about it differs from a class stored before any of this existed.
 */
export function scheduleFields(
  days: ScheduleDay[] | undefined,
  perDay: ClassesPerDay | undefined,
  history: SchedulePeriod[] | undefined
): ScheduleFields {
  const timeline = normalizePeriods(history ?? [makePeriod(days, perDay)]);
  const current = mirrorOf(timeline);
  return {
    schedule_days: current.days,
    sessions_per_day: current.sessions_per_day,
    schedule_history: timeline.length > 1 ? timeline : [],
  };
}
