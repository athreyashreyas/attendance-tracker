import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import {
  classesOnDate,
  classesOnDay,
  computeAttendanceStats,
  computeTermProjection,
  MAX_TERM_DAYS,
  countClassDays,
  countClassesInTimetable,
  daysOff,
  expandToClasses,
  expectedClassesInRange,
  expectedDatesInRange,
  generateExpectedDates,
  isDayOff,
  isWithinTerm,
  scheduleHoldsClass,
  termWindow,
} from './calculations';
import { makeCourse, makeSemester, makeSession, makeSessions } from './test-factories';
import { makePeriod } from './schedule';
import { fromDateKey, toDateKey } from '../utils/dates';
import type { Course, ScheduleDay, Session, SessionStatus } from '../types';

// September 2026: the 7th, 14th, 21st and 28th are Mondays; the 9th, 16th,
// 23rd and 30th are Wednesdays. A course meets on those two days by default.
const MON = 1 as ScheduleDay;
const WED = 3 as ScheduleDay;
const d = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;
const date = (key: string) => new Date(`${key}T00:00:00`);

describe('computeAttendanceStats', () => {
  const course = makeCourse({ min_attendance_pct: 75 });

  it('has nothing to say about a class with no record yet', () => {
    const stats = computeAttendanceStats(course, []);
    expect(stats.total).toBe(0);
    expect(stats.percentage).toBe(0);
    expect(stats.isAtRisk).toBe(false); // no record is not the same as at risk
    expect(stats.canMissMore).toBe(0);
  });

  it('counts attendance out of the classes that actually ran', () => {
    const stats = computeAttendanceStats(
      course,
      makeSessions(course.id, [
        [d(7), 'present'],
        [d(9), 'present'],
        [d(14), 'absent'],
        [d(16), 'cancelled'],
        [d(21), 'planned'],
      ])
    );
    expect(stats.present).toBe(2);
    expect(stats.absent).toBe(1);
    expect(stats.cancelled).toBe(1);
    // Cancelled and not-yet-marked classes sit outside the total entirely.
    expect(stats.total).toBe(3);
    expect(stats.percentage).toBe(66.7);
  });

  it('counts both classes of a day that meets twice', () => {
    const stats = computeAttendanceStats(
      course,
      makeSessions(course.id, [
        [d(7), 'present', 1],
        [d(7), 'absent', 2],
      ])
    );
    expect(stats.total).toBe(2);
    expect(stats.percentage).toBe(50);
  });

  it('ignores deleted rows', () => {
    const sessions = makeSessions(course.id, [
      [d(7), 'present'],
      [d(9), 'absent'],
    ]);
    sessions[1] = { ...sessions[1], deleted_at: '2026-09-10T00:00:00.000Z' };
    expect(computeAttendanceStats(course, sessions).total).toBe(1);
  });

  it('says how many more can be missed while holding the threshold', () => {
    // 8 of 10 at 75%: missing two more lands exactly on 8/12 = 66%, so only one
    // more can go (9 of 12 would be needed).
    const stats = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 75 }),
      makeSessions(
        'c',
        Array.from({ length: 10 }, (_, i): [string, SessionStatus] => [
          d(i + 1),
          i < 8 ? 'present' : 'absent',
        ])
      )
    );
    expect(stats.percentage).toBe(80);
    expect(stats.canMissMore).toBe(0); // 8/11 = 72.7%, already below
  });

  it('does not lose a class to floating point noise', () => {
    // 33 attended of 33 at 55%: 33 / 0.55 is 59.999999999999993 rather than 60
    // in binary floating point, so flooring it without an epsilon reports 26
    // classes free when 27 really are. 33 of 60 is exactly 55%.
    const sessions = makeSessions(
      'c',
      Array.from({ length: 33 }, (_, i): [string, SessionStatus] => [
        toDateKey(addDays(date(d(1)), i)),
        'present',
      ])
    );
    const stats = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 55 }),
      sessions
    );
    expect(stats.canMissMore).toBe(27);
  });

  it('holds the line when a percentage lands exactly on the threshold', () => {
    // 3 present of 5 at 60% is exactly on the line: 3 / 0.6 - 5 evaluates to
    // 4.999999999999999 in binary floating point, which would floor to -1.
    const stats = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 60 }),
      makeSessions('c', [
        [d(1), 'present'],
        [d(2), 'present'],
        [d(3), 'present'],
        [d(4), 'absent'],
        [d(5), 'absent'],
      ])
    );
    expect(stats.percentage).toBe(60);
    expect(stats.isAtRisk).toBe(false);
    expect(stats.canMissMore).toBe(0);
  });

  it('says how many in a row will climb back above the line', () => {
    // 1 of 4 at 75%: (1 + m) / (4 + m) >= 0.75 needs m = 8.
    const stats = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 75 }),
      makeSessions('c', [
        [d(1), 'present'],
        [d(2), 'absent'],
        [d(3), 'absent'],
        [d(4), 'absent'],
      ])
    );
    expect(stats.isAtRisk).toBe(true);
    expect(stats.needToAttend).toBe(8);
  });

  it('admits when a hundred percent requirement can never be recovered', () => {
    const stats = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 100 }),
      makeSessions('c', [
        [d(1), 'present'],
        [d(2), 'absent'],
      ])
    );
    expect(stats.needToAttend).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('generateExpectedDates', () => {
  const course = makeCourse({ schedule_days: [MON, WED] });

  it('returns the class days between two dates', () => {
    const dates = generateExpectedDates(course, date(d(7)), date(d(16)));
    expect(dates.map((x) => x.toDateString().slice(0, 3))).toEqual([
      'Mon',
      'Wed',
      'Mon',
      'Wed',
    ]);
  });

  it('leaves out the days the class was taken off', () => {
    const off = makeCourse({ schedule_days: [MON, WED], excluded_dates: [d(9)] });
    const dates = generateExpectedDates(off, date(d(7)), date(d(16)));
    expect(dates).toHaveLength(3);
    expect(dates.some((x) => x.getDate() === 9)).toBe(false);
  });

  it('returns nothing for a class with no days, or an impossible range', () => {
    expect(generateExpectedDates(makeCourse({ schedule_days: [] }), date(d(7)), date(d(16)))).toEqual([]);
    expect(generateExpectedDates(course, date(d(16)), date(d(7)))).toEqual([]);
    expect(generateExpectedDates(course, new Date('nonsense'), date(d(16)))).toEqual([]);
  });
});

describe('a timetable that changes partway through the term', () => {
  // Mon and Wed to start with; from Tuesday the 15th the class moves to Tue
  // and Thu. The 7th, 14th, 21st, 28th are Mondays; the 8th, 15th, 22nd, 29th
  // Tuesdays; the 9th, 16th, 23rd, 30th Wednesdays; the 10th, 17th, 24th
  // Thursdays.
  const TUE = 2 as ScheduleDay;
  const THU = 4 as ScheduleDay;
  const moved = makeCourse({
    // The mirror is the timetable running now, as the app writes it.
    schedule_days: [TUE, THU],
    schedule_history: [
      makePeriod([MON, WED]),
      makePeriod([TUE, THU], {}, d(15)),
    ],
    start_date: d(1),
    end_date: d(30),
  });

  it('expects the old days before the change and the new ones after it', () => {
    const dates = generateExpectedDates(moved, date(d(1)), date(d(30)));
    expect(dates.map((x) => x.getDate())).toEqual([
      2, 7, 9, 14, // Wed, Mon, Wed, Mon: the old timetable
      15, 17, 22, 24, 29, // Tue, Thu, Tue, Thu, Tue: the new one
    ]);
  });

  it('counts the term as it actually ran, not as the newest timetable would have', () => {
    const periods = [
      makePeriod([MON, WED]),
      makePeriod([TUE, THU], {}, d(15)),
    ];
    expect(countClassesInTimetable(periods, d(1), d(30), [])).toBe(9);
    // The same span read as though the class had always met Tue and Thu.
    expect(countClassDays([TUE, THU], d(1), d(30), [])).toBe(9);
    // ...which is a different set of days, even where the totals agree.
    expect(countClassesInTimetable(periods, d(1), d(14), [])).toBe(4);
    expect(countClassDays([TUE, THU], d(1), d(14), [])).toBe(4);
    expect(countClassesInTimetable(periods, d(7), d(9), [])).toBe(2); // Mon, Wed
    expect(countClassDays([TUE, THU], d(7), d(9), [])).toBe(1); // Thu only
  });

  it('still takes days off out, whichever timetable they fall under', () => {
    const periods = [makePeriod([MON, WED]), makePeriod([TUE, THU], {}, d(15))];
    expect(countClassesInTimetable(periods, d(1), d(30), [d(7), d(22)])).toBe(7);
  });

  it('holds the old days on old dates and the new days on new ones', () => {
    expect(classesOnDate(moved, d(7))).toBe(1); // a Monday, before the change
    expect(classesOnDate(moved, d(8))).toBe(0); // a Tuesday, before it
    expect(classesOnDate(moved, d(21))).toBe(0); // a Monday, after it
    expect(classesOnDate(moved, d(22))).toBe(1); // a Tuesday, after it
  });

  it('keeps the classes that ran under the old timetable on the day grid', () => {
    const session = makeSession(moved.id, d(7), 'present');
    const [held] = classesOnDay(moved, d(7), [session]);
    expect(held.scheduled).toBe(true);
    // And a Monday after the change is no longer a class day, though anything
    // recorded on it stays readable.
    expect(classesOnDay(moved, d(21), [])).toEqual([]);
  });

  it('counts only what is still to come under the timetable in force', () => {
    // Standing on the 15th, the day the new timetable takes over: the 15th,
    // 17th, 22nd, 24th and 29th are still to come.
    const proj = computeTermProjection(moved, [], d(1), d(30), d(15));
    expect(proj.remaining).toBe(5);
  });

  it('gives the calendar the old days before the change and the new ones after', () => {
    // classesOnDay is what CalendarPage.shapeOf calls for every square of the
    // month, and what its dots are drawn from. Walking September through it is
    // the calendar's own question: which days does this class sit on?
    const withClass: number[] = [];
    for (let day = 1; day <= 30; day++) {
      const key = d(day);
      if (classesOnDay(moved, key, []).length > 0) withClass.push(day);
    }
    expect(withClass).toEqual([
      2, 7, 9, 14, // Wed, Mon, Wed, Mon: the old timetable
      15, 17, 22, 24, 29, // Tue, Thu, Tue, Thu, Tue: the new one
    ]);
  });

  it('still shows a class marked on a day the new timetable dropped', () => {
    // The record outlives the schedule: a Monday after the change is no longer
    // a class day, but a Monday you marked is still on the calendar, and still
    // in your percentage.
    const marked = makeSession(moved.id, d(21), 'present');
    const [row] = classesOnDay(moved, d(21), [marked]);
    expect(row.session?.status).toBe('present');
    expect(row.scheduled).toBe(false); // there, but no longer expected
    expect(computeAttendanceStats(moved, [marked]).present).toBe(1);
  });

  it('reads a change in how often a day meets, not only which days', () => {
    const doubled = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
      schedule_history: [
        makePeriod([MON]),
        makePeriod([MON], { [MON]: 2 }, d(15)),
      ],
    });
    expect(classesOnDate(doubled, d(7))).toBe(1);
    expect(classesOnDate(doubled, d(21))).toBe(2);
    expect(
      expandToClasses(doubled, [date(d(7)), date(d(21))]).map(
        (c) => `${c.date}#${c.slot}`
      )
    ).toEqual([`${d(7)}#1`, `${d(21)}#1`, `${d(21)}#2`]);
  });

  it('falls back to the class\'s own days when it has no timeline at all', () => {
    const plain = makeCourse({ schedule_days: [MON, WED] });
    expect(classesOnDate(plain, d(7))).toBe(1);
    expect(generateExpectedDates(plain, date(d(7)), date(d(16)))).toHaveLength(4);
  });
});

describe('expectedDatesInRange', () => {
  it('never runs past the class dates, however wide the window', () => {
    const course = makeCourse({
      schedule_days: [MON, WED],
      start_date: d(9),
      end_date: d(21),
    });
    const dates = expectedDatesInRange(course, date(d(1)), date(d(30)));
    expect(dates.map((x) => x.getDate())).toEqual([9, 14, 16, 21]);
  });
});

describe('expandToClasses / expectedClassesInRange', () => {
  it('turns a day that meets twice into two classes', () => {
    const course = makeCourse({
      schedule_days: [MON, WED],
      sessions_per_day: { [MON]: 2 },
    });
    const classes = expandToClasses(course, [date(d(7)), date(d(9))]);
    expect(classes).toEqual([
      { date: d(7), slot: 1, total: 2 },
      { date: d(7), slot: 2, total: 2 },
      { date: d(9), slot: 1, total: 1 },
    ]);
  });

  it('expands a whole range, days off and class dates respected', () => {
    const course = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
      start_date: d(7),
      end_date: d(21),
      excluded_dates: [d(14)],
    });
    const classes = expectedClassesInRange(course, date(d(1)), date(d(30)));
    expect(classes.map((c) => `${c.date}#${c.slot}`)).toEqual([
      `${d(7)}#1`,
      `${d(7)}#2`,
      `${d(21)}#1`,
      `${d(21)}#2`,
    ]);
  });
});

describe('countClassDays', () => {
  it('counts the classes a schedule produces, doubles included', () => {
    expect(countClassDays([MON, WED], d(7), d(16), [])).toBe(4);
    expect(countClassDays([MON, WED], d(7), d(16), [], { [MON]: 2 })).toBe(6);
  });

  it('drops a day taken off, and every class on it', () => {
    expect(countClassDays([MON], d(7), d(21), [d(14)], { [MON]: 2 })).toBe(4);
  });

  it('counts nothing without days or a sane range', () => {
    expect(countClassDays([], d(7), d(16), [])).toBe(0);
    expect(countClassDays([MON], '', d(16), [])).toBe(0);
    expect(countClassDays([MON], d(16), d(7), [])).toBe(0);
  });
});

describe('days off', () => {
  it('reads a class synced before days off existed as having none', () => {
    const course = makeCourse();
    delete (course as { excluded_dates?: unknown }).excluded_dates;
    expect(daysOff(course)).toEqual([]);
    expect(isDayOff(course, d(7))).toBe(false);
  });

  it('holds no classes at all on a day off', () => {
    const course = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
      excluded_dates: [d(14)],
    });
    expect(classesOnDate(course, d(7))).toBe(2);
    expect(classesOnDate(course, d(14))).toBe(0);
    expect(classesOnDate(course, d(8))).toBe(0); // a Tuesday: not a class day
  });
});

describe('termWindow / isWithinTerm', () => {
  const semester = makeSemester({ start_date: d(7), end_date: d(30) });

  it('prefers the class dates, and falls back to its term', () => {
    expect(termWindow(makeCourse({ start_date: d(9) }), semester)).toEqual({
      start: d(9),
      end: d(30),
    });
    expect(termWindow(makeCourse(), semester)).toEqual({
      start: d(7),
      end: d(30),
    });
  });

  it('treats a class with no dates at all as always running', () => {
    expect(isWithinTerm(makeCourse(), null, d(1))).toBe(true);
  });

  it('excludes dates on either side of the term', () => {
    const course = makeCourse();
    expect(isWithinTerm(course, semester, d(1))).toBe(false);
    expect(isWithinTerm(course, semester, d(7))).toBe(true); // first day included
    expect(isWithinTerm(course, semester, d(30))).toBe(true); // last day included
    expect(isWithinTerm(course, semester, '2026-10-01')).toBe(false);
  });
});

describe('scheduleHoldsClass', () => {
  it('holds the classes a weekday is set to, and no more', () => {
    expect(scheduleHoldsClass([MON], { [MON]: 2 }, [], d(7), 2)).toBe(true);
    expect(scheduleHoldsClass([MON], { [MON]: 2 }, [], d(7), 3)).toBe(false);
    expect(scheduleHoldsClass([MON], {}, [], d(7), 2)).toBe(false);
  });

  it('holds nothing on a day off or a day the class does not meet', () => {
    expect(scheduleHoldsClass([MON], {}, [d(7)], d(7), 1)).toBe(false);
    expect(scheduleHoldsClass([MON], {}, [], d(8), 1)).toBe(false);
  });
});

describe('classesOnDay', () => {
  const course = makeCourse({ schedule_days: [MON], sessions_per_day: { [MON]: 2 } });

  it('offers both classes of a double day, marked or not', () => {
    const classes = classesOnDay(course, d(7), [
      makeSession(course.id, d(7), 'present', { slot: 1 }),
    ]);
    expect(classes).toHaveLength(2);
    expect(classes[0].session?.status).toBe('present');
    expect(classes[1]).toMatchObject({ slot: 2, session: null, scheduled: true });
  });

  it('includes an extra class added by hand past the schedule', () => {
    const classes = classesOnDay(course, d(7), [
      makeSession(course.id, d(7), 'present', { slot: 1 }),
      makeSession(course.id, d(7), 'present', { slot: 2 }),
      makeSession(course.id, d(7), 'planned', { slot: 3 }),
    ]);
    expect(classes).toHaveLength(3);
    expect(classes[2]).toMatchObject({ slot: 3, scheduled: false });
  });

  it('leaves a gap where a class was deleted rather than inventing one', () => {
    // Slot 2 is gone; slot 3 was added by hand. Slot 2 is not a class to mark.
    const single = makeCourse({ schedule_days: [MON] });
    const classes = classesOnDay(single, d(7), [
      makeSession(single.id, d(7), 'present', { slot: 1 }),
      makeSession(single.id, d(7), 'absent', { slot: 3 }),
    ]);
    expect(classes.map((c) => c.slot)).toEqual([1, 3]);
  });

  it('holds nothing on a day off, beyond what was actually recorded', () => {
    const off = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
      excluded_dates: [d(7)],
    });
    expect(classesOnDay(off, d(7), [])).toEqual([]);
    const recorded = classesOnDay(off, d(7), [
      makeSession(off.id, d(7), 'present', { slot: 1 }),
    ]);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].scheduled).toBe(false);
  });

  it('holds nothing before the term starts', () => {
    const semester = makeSemester({ start_date: d(14), end_date: d(30) });
    const inTerm = makeCourse({ schedule_days: [MON], semester_id: semester.id });
    expect(classesOnDay(inTerm, d(7), [], semester)).toEqual([]);
    expect(classesOnDay(inTerm, d(14), [], semester)).toHaveLength(1);
  });

  it('ignores sessions belonging to another class or another day', () => {
    const other = makeCourse();
    const classes = classesOnDay(makeCourse({ schedule_days: [] }), d(7), [
      makeSession(other.id, d(7), 'present'),
      makeSession('anything', d(9), 'present'),
    ]);
    expect(classes).toEqual([]);
  });

  it('ignores deleted rows', () => {
    const single = makeCourse({ schedule_days: [] });
    const classes = classesOnDay(single, d(7), [
      makeSession(single.id, d(7), 'present', {
        deleted_at: '2026-09-08T00:00:00.000Z',
      }),
    ]);
    expect(classes).toEqual([]);
  });
});

describe('computeTermProjection', () => {
  const project = (course: Course, sessions: Session[] = [], today = d(7)) =>
    computeTermProjection(course, sessions, d(7), d(30), today);

  it('counts every class still to come, both halves of a double', () => {
    const course = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
    });
    // Mondays: 7th, 14th, 21st, 28th, twice each.
    expect(project(course).remaining).toBe(8);
  });

  it('stops counting a class once it has been decided', () => {
    const course = makeCourse({ schedule_days: [MON], sessions_per_day: { [MON]: 2 } });
    const marked = computeTermProjection(
      course,
      makeSessions(course.id, [
        [d(7), 'present', 1],
        [d(7), 'absent', 2],
        [d(14), 'cancelled', 1],
      ]),
      d(7),
      d(30),
      d(7)
    );
    // 8 classes, 3 settled: the second class of the 14th is still to come.
    expect(marked.remaining).toBe(5);
    expect(marked.projectedTotal).toBe(1 + 1 + 5); // cancelled counts for nothing
  });

  it('leaves the past alone: a class nobody marked is simply gone', () => {
    const course = makeCourse({ schedule_days: [MON] });
    // Standing on the 21st, the 7th and 14th are behind us and unmarked.
    expect(project(course, [], d(21)).remaining).toBe(2); // the 21st and 28th
  });

  it('counts an ad-hoc class placed in the future, but only once', () => {
    const course = makeCourse({ schedule_days: [MON] });
    const withExtra = computeTermProjection(
      course,
      [
        // A Friday the schedule knows nothing about.
        makeSession(course.id, '2026-09-25', 'planned'),
        // A planned class that is already on the schedule: not a second class.
        makeSession(course.id, d(28), 'planned'),
      ],
      d(7),
      d(30),
      d(7)
    );
    expect(withExtra.remaining).toBe(5); // four Mondays, plus the Friday
  });

  it('works out what must be attended, and what can still be skipped', () => {
    const course = makeCourse({ schedule_days: [MON], min_attendance_pct: 75 });
    const proj = computeTermProjection(
      course,
      makeSessions(course.id, [
        [d(7), 'present'],
        [d(14), 'absent'],
      ]),
      d(7),
      d(30),
      d(21)
    );
    expect(proj.remaining).toBe(2); // the 21st and 28th
    expect(proj.projectedTotal).toBe(4);
    expect(proj.mustAttend).toBe(2); // 3 of 4 attended to hold 75%
    expect(proj.canSkip).toBe(0);
    expect(proj.reachable).toBe(true);
    expect(proj.bestPct).toBe(75);
    expect(proj.worstPct).toBe(25);
  });

  it('says plainly when the threshold can no longer be reached', () => {
    const course = makeCourse({ schedule_days: [MON], min_attendance_pct: 75 });
    const proj = computeTermProjection(
      course,
      makeSessions(course.id, [
        [d(7), 'absent'],
        [d(14), 'absent'],
        [d(21), 'absent'],
      ]),
      d(7),
      d(30),
      d(28)
    );
    expect(proj.remaining).toBe(1);
    expect(proj.reachable).toBe(false);
    expect(proj.canSkip).toBe(0);
    expect(proj.bestPct).toBe(25);
  });

  it('has nothing to project for a class with no schedule', () => {
    const proj = project(makeCourse({ schedule_days: [] }));
    expect(proj).toMatchObject({
      remaining: 0,
      projectedTotal: 0,
      bestPct: 0,
      worstPct: 0,
    });
  });
});

describe('runaway date ranges', () => {
  // A mistyped year in the class form used to walk the range a day at a time
  // on every keystroke: 9999 is roughly 2.9 million iterations, three times
  // over, which locks the tab. Past MAX_TERM_DAYS the range is refused.
  it('refuses a span longer than ten years rather than walking it', () => {
    expect(countClassDays([1, 3], '2026-01-01', '9999-12-31', [])).toBe(0);
  });

  it('still counts a range that sits just inside the bound', () => {
    // 3660 days is a shade over ten years, so this is the last accepted span.
    const end = toDateKey(addDays(fromDateKey('2026-01-01'), MAX_TERM_DAYS));
    expect(countClassDays([1], '2026-01-01', end, [])).toBeGreaterThan(0);
    const tooFar = toDateKey(addDays(fromDateKey('2026-01-01'), MAX_TERM_DAYS + 1));
    expect(countClassDays([1], '2026-01-01', tooFar, [])).toBe(0);
  });

  it('refuses the same span when expanding a schedule into dates', () => {
    const course = makeCourse({ schedule_days: [1, 3] });
    expect(
      generateExpectedDates(course, fromDateKey('2026-01-01'), fromDateKey('9999-12-31'))
    ).toEqual([]);
  });
});

describe('computeAttendanceStats — the thresholds at their extremes', () => {
  const sessionsOf = (present: number, absent: number) =>
    makeSessions('c', [
      ...Array.from({ length: present }, (_, i): [string, SessionStatus] => [d(i + 1), 'present']),
      ...Array.from({ length: absent }, (_, i): [string, SessionStatus] => [
        d(present + i + 1),
        'absent',
      ]),
    ]);

  it('lets you miss as many as you like when nothing is required', () => {
    const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: 0 }), sessionsOf(1, 5));
    expect(stats.canMissMore).toBe(Number.POSITIVE_INFINITY);
    expect(stats.isAtRisk).toBe(false);
    expect(stats.needToAttend).toBe(0);
  });

  it('says a perfect record is unrecoverable once one class is missed at 100%', () => {
    const perfect = computeAttendanceStats(makeCourse({ min_attendance_pct: 100 }), sessionsOf(5, 0));
    expect(perfect.canMissMore).toBe(0);
    expect(perfect.isAtRisk).toBe(false);

    const slipped = computeAttendanceStats(makeCourse({ min_attendance_pct: 100 }), sessionsOf(5, 1));
    expect(slipped.isAtRisk).toBe(true);
    // No number of future classes brings 5/6 back to 100%.
    expect(slipped.needToAttend).toBe(Number.POSITIVE_INFINITY);
  });

  it('asks for nothing more once the threshold is already held', () => {
    const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: 75 }), sessionsOf(9, 1));
    expect(stats.percentage).toBe(90);
    expect(stats.needToAttend).toBe(0);
    expect(stats.isAtRisk).toBe(false);
  });

  it('asks for exactly enough classes to climb back to the line', () => {
    // 5 of 10 at 75%: attending 10 straight gives 15/20 = 75% exactly.
    const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: 75 }), sessionsOf(5, 5));
    expect(stats.needToAttend).toBe(10);

    const recovered = computeAttendanceStats(
      makeCourse({ min_attendance_pct: 75 }),
      sessionsOf(15, 5)
    );
    expect(recovered.percentage).toBe(75);
    expect(recovered.isAtRisk).toBe(false);
  });

  it('is never at risk with no record at all, at any threshold', () => {
    // No record is not the same as a bad record. `needToAttend` is not asserted
    // here: with nothing recorded there is no shortfall to make up, and the
    // figure it computes (-0 at most thresholds, Infinity at 100%) is only ever
    // read behind isAtRisk, which is false.
    for (const pct of [0, 75, 100]) {
      const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: pct }), []);
      expect(stats.isAtRisk).toBe(false);
      expect(stats.canMissMore).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.percentage).toBe(0);
    }
  });

  it('never reports a negative allowance, however far behind the record is', () => {
    const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: 90 }), sessionsOf(1, 9));
    expect(stats.canMissMore).toBe(0);
    expect(stats.isAtRisk).toBe(true);
  });

  it('rounds the percentage to one place, the way the ring reads it', () => {
    const stats = computeAttendanceStats(makeCourse({ min_attendance_pct: 75 }), sessionsOf(2, 1));
    expect(stats.percentage).toBe(66.7); // 66.666… , not 66.7000000001
    expect(computeAttendanceStats(makeCourse(), sessionsOf(1, 2)).percentage).toBe(33.3);
  });

  it('carries the threshold and the course id back out, for the row that renders it', () => {
    const course = makeCourse({ min_attendance_pct: 80 });
    const stats = computeAttendanceStats(course, sessionsOf(4, 1));
    expect(stats.courseId).toBe(course.id);
    expect(stats.threshold).toBe(80);
  });

  it('holds its own arithmetic together: present + absent is the total', () => {
    for (const [p, a] of [[0, 0], [3, 0], [0, 3], [7, 5]] as const) {
      const stats = computeAttendanceStats(makeCourse(), sessionsOf(p, a));
      expect(stats.total).toBe(stats.present + stats.absent);
      if (stats.total > 0) {
        expect(stats.percentage).toBeCloseTo(Math.round((p / stats.total) * 1000) / 10, 10);
      }
    }
  });
});

describe('classesOnDate', () => {
  const course = makeCourse({
    schedule_days: [MON, WED],
    sessions_per_day: { [MON]: 2 },
  });

  it('gives the weekday its own count', () => {
    expect(classesOnDate(course, d(7))).toBe(2); // Monday, meets twice
    expect(classesOnDate(course, d(9))).toBe(1); // Wednesday, once
  });

  it('is zero on a weekday the class does not meet', () => {
    expect(classesOnDate(course, d(8))).toBe(0); // Tuesday
  });

  it('takes the whole day off, both halves of a double', () => {
    const withHoliday = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 2 },
      excluded_dates: [d(14)],
    });
    expect(classesOnDate(withHoliday, d(7))).toBe(2);
    expect(classesOnDate(withHoliday, d(14))).toBe(0);
  });

  it('treats a row written before the columns existed as meeting once', () => {
    const legacy = makeCourse({ schedule_days: [MON] });
    delete (legacy as { sessions_per_day?: unknown }).sessions_per_day;
    delete (legacy as { excluded_dates?: unknown }).excluded_dates;
    expect(classesOnDate(legacy, d(7))).toBe(1);
    expect(daysOff(legacy)).toEqual([]);
    expect(isDayOff(legacy, d(7))).toBe(false);
  });

  it('clamps a count that could not be a real timetable', () => {
    const absurd = makeCourse({ schedule_days: [MON], sessions_per_day: { [MON]: 99 } });
    expect(classesOnDate(absurd, d(7))).toBe(6); // MAX_CLASSES_PER_DAY
    const nonsense = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { [MON]: 0 } as unknown as Course['sessions_per_day'],
    });
    expect(classesOnDate(nonsense, d(7))).toBe(1);
  });

  it('reads the date locally, so a class never lands on the wrong weekday', () => {
    // 7 September 2026 is a Monday everywhere the app runs; parsing the key as
    // UTC would make it a Sunday west of Greenwich.
    expect(date(d(7)).getDay()).toBe(MON);
    expect(classesOnDate(makeCourse({ schedule_days: [MON] }), d(7))).toBe(1);
  });
});
