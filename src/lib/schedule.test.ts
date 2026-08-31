import { describe, expect, it } from 'vitest';
import {
  MAX_SCHEDULE_CHANGES,
  addScheduleChange,
  applyScheduleChange,
  classesOnDateIn,
  classesOnWeekdayIn,
  editPeriod,
  formatDays,
  formatSpan,
  hasScheduleChanges,
  indexOfPeriodOn,
  makePeriod,
  mirrorOf,
  moveScheduleChange,
  nextDay,
  normalizePeriods,
  periodOn,
  periodsEqual,
  previousDay,
  removeScheduleChange,
  scheduleFields,
  scheduleOn,
  schedulePeriods,
  scheduleSpans,
  sortPeriods,
  spanIsEmpty,
  timelinesDiffer,
  timetableHoldsClass,
} from './schedule';
import { makeCourse } from './test-factories';
import type { ScheduleDay, SchedulePeriod } from '../types';

const MON = 1 as ScheduleDay;
const TUE = 2 as ScheduleDay;
const WED = 3 as ScheduleDay;
const THU = 4 as ScheduleDay;

/** September 2026: the 7th is a Monday, so d(7) is a Monday and d(8) a Tuesday. */
const d = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;

/** Mon and Wed to begin with, Tue and Thu from Tuesday the 15th. */
const MOVED: SchedulePeriod[] = [
  makePeriod([MON, WED]),
  makePeriod([TUE, THU], {}, d(15)),
];

describe('makePeriod', () => {
  it('keeps the days in week order, once each', () => {
    expect(makePeriod([WED, MON, MON] as ScheduleDay[]).days).toEqual([MON, WED]);
  });

  it('drops anything that is not a weekday', () => {
    const period = makePeriod([MON, 9, -1, NaN] as unknown as ScheduleDay[]);
    expect(period.days).toEqual([MON]);
  });

  it('keeps counts only for days that meet more than once', () => {
    const period = makePeriod([MON, WED], { [MON]: 2, [WED]: 1, [THU]: 3 });
    expect(period.sessions_per_day).toEqual({ [MON]: 2 });
  });

  it('refuses a date that is not a date key', () => {
    expect(makePeriod([MON], {}, 'someday').effective_from).toBeNull();
    expect(makePeriod([MON], {}, d(15)).effective_from).toBe(d(15));
  });
});

describe('normalizePeriods', () => {
  it('has nothing to say about an empty or missing timeline', () => {
    expect(normalizePeriods([])).toEqual([]);
    expect(normalizePeriods(undefined)).toEqual([]);
    expect(normalizePeriods(null)).toEqual([]);
  });

  it('puts the opening timetable first and the changes in date order', () => {
    const out = normalizePeriods([
      makePeriod([THU], {}, d(21)),
      makePeriod([TUE], {}, d(15)),
      makePeriod([MON]),
    ]);
    expect(out.map((p) => p.effective_from)).toEqual([null, d(15), d(21)]);
  });

  it('keeps one change per date, the last one written', () => {
    const out = normalizePeriods([
      makePeriod([MON]),
      makePeriod([TUE], {}, d(15)),
      makePeriod([THU], {}, d(15)),
    ]);
    expect(out).toHaveLength(2);
    expect(out[1].days).toEqual([THU]);
  });

  it('drops a change that changes nothing', () => {
    const out = normalizePeriods([
      makePeriod([MON, WED]),
      makePeriod([MON, WED], {}, d(15)),
    ]);
    expect(out).toHaveLength(1);
  });

  it('counts a change in how often a day meets as a real change', () => {
    const out = normalizePeriods([
      makePeriod([MON]),
      makePeriod([MON], { [MON]: 2 }, d(15)),
    ]);
    expect(out).toHaveLength(2);
  });

  it('gives the start of term a timetable when the opening one is missing', () => {
    const out = normalizePeriods([
      makePeriod([THU], {}, d(21)),
      makePeriod([TUE], {}, d(15)),
    ]);
    expect(out[0].effective_from).toBeNull();
    expect(out[0].days).toEqual([TUE]);
    expect(out[1].effective_from).toBe(d(21));
  });

  it('survives rubbish in the array rather than believing it', () => {
    const out = normalizePeriods([
      null,
      undefined,
      { days: 'nope', sessions_per_day: null, effective_from: 5 },
      makePeriod([MON]),
    ] as unknown as SchedulePeriod[]);
    expect(out).toHaveLength(1);
    expect(out[0].days).toEqual([MON]);
  });
});

describe('periodOn', () => {
  it('reads the opening timetable before the first change', () => {
    expect(periodOn(MOVED, d(14)).days).toEqual([MON, WED]);
  });

  it('reads the new timetable from the day it takes over', () => {
    expect(periodOn(MOVED, d(15)).days).toEqual([TUE, THU]);
    expect(periodOn(MOVED, '2027-01-01').days).toEqual([TUE, THU]);
  });

  it('does not care what order the timeline arrives in', () => {
    const shuffled = [MOVED[1], MOVED[0]];
    expect(periodOn(shuffled, d(14)).days).toEqual([MON, WED]);
    expect(periodOn(shuffled, d(20)).days).toEqual([TUE, THU]);
  });

  it('falls back to the earliest change when there is no opening timetable', () => {
    const orphaned = [makePeriod([TUE], {}, d(15))];
    expect(periodOn(orphaned, d(1)).days).toEqual([TUE]);
  });

  it('holds no class at all for an empty timeline', () => {
    expect(periodOn([], d(7)).days).toEqual([]);
  });
});

describe('schedulePeriods', () => {
  it('reads a class that has never changed its days as one timetable', () => {
    const course = makeCourse({ schedule_days: [MON, WED] });
    const periods = schedulePeriods(course);
    expect(periods).toHaveLength(1);
    expect(periods[0].effective_from).toBeNull();
    expect(periods[0].days).toEqual([MON, WED]);
    expect(hasScheduleChanges(course)).toBe(false);
  });

  it('reads the timeline when the class has one', () => {
    const course = makeCourse({
      schedule_days: [TUE, THU],
      schedule_history: MOVED,
    });
    expect(hasScheduleChanges(course)).toBe(true);
    expect(scheduleOn(course, d(14)).days).toEqual([MON, WED]);
    expect(scheduleOn(course, d(15)).days).toEqual([TUE, THU]);
  });

  it('takes an older build editing the days as a correction of the newest timetable', () => {
    // An older build knows only schedule_days, so this is what a class edited
    // on a device that has not updated yet syncs back as.
    const course = makeCourse({
      schedule_days: [THU],
      schedule_history: MOVED,
    });
    const periods = schedulePeriods(course);
    expect(periods).toHaveLength(2);
    // The change date and everything before it are untouched.
    expect(periods[0].days).toEqual([MON, WED]);
    expect(periods[1].effective_from).toBe(d(15));
    expect(periods[1].days).toEqual([THU]);
  });

  it('ignores an empty mirror rather than reading it as a class with no days', () => {
    const course = makeCourse({ schedule_days: [], schedule_history: MOVED });
    expect(schedulePeriods(course)).toHaveLength(2);
    expect(scheduleOn(course, d(20)).days).toEqual([TUE, THU]);
  });

  it('reads a class synced before timelines existed', () => {
    const legacy = makeCourse({ schedule_days: [MON] });
    delete (legacy as Partial<typeof legacy>).schedule_history;
    delete (legacy as Partial<typeof legacy>).sessions_per_day;
    expect(schedulePeriods(legacy)).toHaveLength(1);
    expect(classesOnDateIn(schedulePeriods(legacy), d(7))).toBe(1);
  });
});

describe('classes on a date', () => {
  it('counts the classes the timetable of that day holds', () => {
    const periods = [
      makePeriod([MON], { [MON]: 2 }),
      makePeriod([MON], {}, d(15)),
    ];
    expect(classesOnDateIn(periods, d(7))).toBe(2); // Monday, under the old one
    expect(classesOnDateIn(periods, d(21))).toBe(1); // Monday, under the new one
  });

  it('holds nothing on a weekday the timetable does not meet', () => {
    expect(classesOnWeekdayIn(makePeriod([MON]), TUE)).toBe(0);
    expect(classesOnDateIn(MOVED, d(8))).toBe(0); // a Tuesday, before the change
    expect(classesOnDateIn(MOVED, d(22))).toBe(1); // a Tuesday, after it
  });

  it('caps a day at a number of classes a day could hold', () => {
    expect(classesOnWeekdayIn(makePeriod([MON], { [MON]: 99 }), MON)).toBe(6);
  });
});

describe('timetableHoldsClass', () => {
  it('holds the classes the timetable of the day is set to, and no more', () => {
    const periods = [makePeriod([MON], { [MON]: 2 })];
    expect(timetableHoldsClass(periods, [], d(7), 2)).toBe(true);
    expect(timetableHoldsClass(periods, [], d(7), 3)).toBe(false);
  });

  it('holds nothing on a day off', () => {
    expect(timetableHoldsClass(MOVED, [d(7)], d(7), 1)).toBe(false);
  });

  it('asks the timetable that was in force, not the one running now', () => {
    // The 7th is a Monday: held before the change, dropped after it.
    expect(timetableHoldsClass(MOVED, [], d(7), 1)).toBe(true);
    expect(timetableHoldsClass(MOVED, [], d(21), 1)).toBe(false);
  });
});

describe('editing a timeline', () => {
  it('adds a change without touching what ran before it', () => {
    const out = addScheduleChange([makePeriod([MON, WED])], d(15), [TUE], {});
    expect(out).toHaveLength(2);
    expect(out[0].days).toEqual([MON, WED]);
    expect(out[1]).toEqual(makePeriod([TUE], {}, d(15)));
  });

  it('replaces a change on a date rather than stacking another on it', () => {
    const out = addScheduleChange(MOVED, d(15), [THU], {});
    expect(out).toHaveLength(2);
    expect(out[1].days).toEqual([THU]);
  });

  it('removes a change, handing its dates back to the timetable before it', () => {
    const out = removeScheduleChange(MOVED, 1);
    expect(out).toHaveLength(1);
    expect(periodOn(out, d(20)).days).toEqual([MON, WED]);
  });

  it('refuses to remove the opening timetable, which covers the start of term', () => {
    expect(removeScheduleChange(MOVED, 0)).toEqual(MOVED);
    expect(removeScheduleChange(MOVED, 7)).toEqual(MOVED);
  });

  it('edits one entry and leaves the date it took over alone', () => {
    const out = editPeriod(MOVED, 1, [THU], { [THU]: 2 });
    expect(out[1].effective_from).toBe(d(15));
    expect(out[1].days).toEqual([THU]);
    expect(out[0]).toEqual(MOVED[0]);
  });

  it('moves a change to another date, keeping the timeline in order', () => {
    const three = addScheduleChange(MOVED, d(21), [MON], {});
    const out = moveScheduleChange(three, 2, d(10));
    expect(out.map((p) => p.effective_from)).toEqual([null, d(10), d(15)]);
  });

  it('sorts the opening timetable to the front whatever it is given', () => {
    const out = sortPeriods([MOVED[1], MOVED[0]]);
    expect(out[0].effective_from).toBeNull();
  });
});

describe('timelinesDiffer', () => {
  it('sees past the order and the noise', () => {
    expect(timelinesDiffer(MOVED, [MOVED[1], MOVED[0]])).toBe(false);
    expect(
      timelinesDiffer(MOVED, [...MOVED, makePeriod([TUE, THU], {}, d(28))])
    ).toBe(false);
  });

  it('reports a change of days, of date, or of how often a day meets', () => {
    expect(timelinesDiffer(MOVED, [MOVED[0]])).toBe(true);
    expect(
      timelinesDiffer(MOVED, [MOVED[0], makePeriod([TUE, THU], {}, d(16))])
    ).toBe(true);
    expect(
      timelinesDiffer(MOVED, [
        MOVED[0],
        makePeriod([TUE, THU], { [TUE]: 2 }, d(15)),
      ])
    ).toBe(true);
  });
});

describe('spans', () => {
  const spans = scheduleSpans(MOVED, d(1), '2026-12-18');

  it('ends each span the day before the next one starts', () => {
    expect(spans[0].start).toBe(d(1));
    expect(spans[0].end).toBe(d(14));
    expect(spans[1].start).toBe(d(15));
    expect(spans[1].end).toBe('2026-12-18');
  });

  it('leaves the ends open when the class has no dates', () => {
    const open = scheduleSpans(MOVED);
    expect(open[0].start).toBeNull();
    expect(open[0].end).toBe(d(14));
    expect(open[1].end).toBeNull();
  });

  it('reads back the way the change would be described', () => {
    expect(formatSpan(spans[0])).toBe('Until 14 Sep');
    expect(formatSpan(spans[1])).toBe('15 Sep to 18 Dec');
    expect(formatSpan(scheduleSpans(MOVED)[1])).toBe('From 15 Sep');
    expect(formatSpan(scheduleSpans([makePeriod([MON])])[0])).toBe(
      'The whole term'
    );
  });

  it('flags a change dated past the end of the class, which covers nothing', () => {
    const late = scheduleSpans(
      [makePeriod([MON]), makePeriod([TUE], {}, '2027-03-01')],
      d(1),
      '2026-12-18'
    );
    expect(spanIsEmpty(late[1])).toBe(true);
    expect(spanIsEmpty(late[0])).toBe(false);
  });

  it('steps a day either way across a month boundary', () => {
    expect(previousDay('2026-09-01')).toBe('2026-08-31');
    expect(nextDay('2026-08-31')).toBe('2026-09-01');
  });
});

describe('formatDays', () => {
  it('lists the days the way they are read out', () => {
    expect(formatDays(makePeriod([MON]))).toBe('Mon');
    expect(formatDays(makePeriod([MON, WED]))).toBe('Mon and Wed');
    expect(formatDays(makePeriod([MON, WED, THU]))).toBe('Mon, Wed and Thu');
  });

  it('names a day that meets more than once', () => {
    expect(formatDays(makePeriod([MON, TUE], { [TUE]: 2 }))).toBe(
      'Mon and Tue ×2'
    );
  });

  it('says so plainly when there are no days', () => {
    expect(formatDays(makePeriod([]))).toBe('No class days');
  });

  it('reads Monday first, however the days were tapped', () => {
    expect(formatDays(makePeriod([0, MON] as ScheduleDay[]))).toBe('Mon and Sun');
  });
});

describe('mirrorOf', () => {
  it('is the newest timetable, which is the one running now', () => {
    expect(mirrorOf(MOVED).days).toEqual([TUE, THU]);
  });

  it('holds no days for a timeline with nothing in it', () => {
    expect(mirrorOf([]).days).toEqual([]);
  });
});

describe('periodsEqual', () => {
  it('ignores the date and compares what actually runs', () => {
    expect(
      periodsEqual(makePeriod([MON]), makePeriod([MON], {}, d(15)))
    ).toBe(true);
    expect(periodsEqual(makePeriod([MON]), makePeriod([MON, WED]))).toBe(false);
    expect(
      periodsEqual(makePeriod([MON]), makePeriod([MON], { [MON]: 2 }))
    ).toBe(false);
  });
});

describe('MAX_SCHEDULE_CHANGES', () => {
  it('is a bound a real term stays well inside', () => {
    expect(MAX_SCHEDULE_CHANGES).toBeGreaterThan(2);
    expect(MAX_SCHEDULE_CHANGES).toBeLessThan(60);
  });
});

describe("a course's timetable on a weekday", () => {
  // These cover what classesOnWeekday used to answer of a course directly.
  // The question now goes through the timeline, since which timetable answers
  // it depends on the date, but the answers themselves have not moved.
  const on = (course: Parameters<typeof schedulePeriods>[0], dateKey: string) =>
    classesOnDateIn(schedulePeriods(course), dateKey);
  const aMonday = d(7);
  const aTuesday = d(8);

  it('holds nothing on a day the class does not meet', () => {
    expect(on(makeCourse({ schedule_days: [MON] }), aTuesday)).toBe(0);
  });

  it('holds one class on a scheduled day by default', () => {
    expect(on(makeCourse({ schedule_days: [MON] }), aMonday)).toBe(1);
  });

  it('holds as many as that weekday is set to', () => {
    const course = makeCourse({
      schedule_days: [MON, TUE],
      sessions_per_day: { 2: 3 },
    });
    expect(on(course, aTuesday)).toBe(3);
    expect(on(course, aMonday)).toBe(1); // untouched days stay at one
  });

  it('ignores a count left behind on a day no longer scheduled', () => {
    const course = makeCourse({
      schedule_days: [MON],
      sessions_per_day: { 2: 2 },
    });
    expect(on(course, aTuesday)).toBe(0);
  });

  it('survives a course synced before per-day counts existed', () => {
    const course = makeCourse({ schedule_days: [MON] });
    delete (course as { sessions_per_day?: unknown }).sessions_per_day;
    expect(on(course, aMonday)).toBe(1);
  });
});

describe('indexOfPeriodOn', () => {
  it('points at the entry a caller would edit for that date', () => {
    expect(indexOfPeriodOn(MOVED, d(14))).toBe(0);
    expect(indexOfPeriodOn(MOVED, d(15))).toBe(1);
  });

  it('points at the opening timetable when there is nothing to go on', () => {
    expect(indexOfPeriodOn([], d(7))).toBe(0);
  });
});

describe('scheduleSpans and the timeline being edited', () => {
  it('keeps every entry, so a row cannot vanish under the user mid-edit', () => {
    // A change edited back to the days before it is still an entry until it is
    // saved. Merging it away here would take its row off the screen.
    const mid = [makePeriod([MON, WED]), makePeriod([MON, WED], {}, d(15))];
    expect(scheduleSpans(mid)).toHaveLength(2);
    // Saving is where it goes.
    expect(normalizePeriods(mid)).toHaveLength(1);
  });

  it('numbers the spans by their place in the list it was given', () => {
    const spans = scheduleSpans([MOVED[1], MOVED[0]]);
    expect(spans.map((s) => s.index)).toEqual([0, 1]);
    expect(spans[0].period.effective_from).toBeNull();
  });
});

describe('applyScheduleChange', () => {
  it('dates the new days and hands the weeks before them back', () => {
    // Mon and Wed, edited to Tue and Thu, told it changed on the 15th.
    const edited = editPeriod([makePeriod([MON, WED])], 0, [TUE, THU], {});
    const out = applyScheduleChange(edited, 0, makePeriod([MON, WED]), d(15));
    expect(out).toEqual(MOVED);
  });

  it('records a second change without disturbing the first', () => {
    const edited = editPeriod(MOVED, 1, [MON], {});
    const out = applyScheduleChange(edited, 1, MOVED[1], d(21));
    expect(out.map((p) => p.effective_from)).toEqual([null, d(15), d(21)]);
    expect(out[1].days).toEqual([TUE, THU]); // put back
    expect(out[2].days).toEqual([MON]); // the new one
  });

  it('replaces a change dated the same day rather than stacking one on it', () => {
    const edited = editPeriod(MOVED, 1, [MON], {});
    const out = applyScheduleChange(edited, 1, MOVED[1], d(15));
    expect(out).toHaveLength(2);
    expect(out[1].days).toEqual([MON]);
  });

  it('needs nothing to restore when the stretch is a new one', () => {
    const out = applyScheduleChange([makePeriod([MON])], 0, null, d(15));
    expect(out.map((p) => p.days)).toEqual([[MON], [MON]]);
    // Which normalization then reads as the non-change it is.
    expect(normalizePeriods(out)).toHaveLength(1);
  });
});

describe('scheduleFields', () => {
  it('stores a class that has never changed exactly as it always was', () => {
    const out = scheduleFields([WED, MON] as ScheduleDay[], { [MON]: 2 }, undefined);
    expect(out.schedule_days).toEqual([MON, WED]);
    expect(out.sessions_per_day).toEqual({ [MON]: 2 });
    // No timeline: nothing about this class looks new to anything reading it.
    expect(out.schedule_history).toEqual([]);
  });

  it('mirrors the newest timetable, not the one that was edited', () => {
    const out = scheduleFields([MON, WED], {}, MOVED);
    expect(out.schedule_days).toEqual([TUE, THU]);
    expect(out.schedule_history).toHaveLength(2);
  });

  it('drops a timeline that has stopped being one', () => {
    // The change edited back to the days before it is no longer a change.
    const out = scheduleFields(
      [MON, WED],
      {},
      [makePeriod([MON, WED]), makePeriod([MON, WED], {}, d(15))]
    );
    expect(out.schedule_history).toEqual([]);
    expect(out.schedule_days).toEqual([MON, WED]);
  });

  it('tidies what it is given rather than storing it as handed over', () => {
    const out = scheduleFields(
      [MON],
      {},
      [makePeriod([TUE], {}, d(15)), makePeriod([MON])]
    );
    expect(out.schedule_history.map((p) => p.effective_from)).toEqual([
      null,
      d(15),
    ]);
    expect(out.schedule_days).toEqual([TUE]);
  });
});
