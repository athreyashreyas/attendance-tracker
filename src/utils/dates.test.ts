import { describe, expect, it } from 'vitest';
import {
  DAY_LABELS,
  DAY_LABELS_SHORT,
  WEEK_ORDER,
  formatLongDate,
  formatMonthLabel,
  formatSessionDate,
  fromDateKey,
  monthGrids,
  nowIso,
  toDateKey,
  todayKey,
} from './dates';

/** The days of one grid as 'YYYY-MM-DD', for readable assertions. */
function keys(days: Date[]): string[] {
  return days.map(toDateKey);
}

describe('monthGrids', () => {
  it('gives every month the term touches its own grid, in order', () => {
    const grids = monthGrids('2026-06-08', '2026-08-20');
    expect(grids.map((g) => g.label)).toEqual([
      'June 2026',
      'July 2026',
      'August 2026',
    ]);
  });

  it('never lets one row carry two months', () => {
    // 30 June 2026 is a Tuesday and 1 July a Wednesday: in a continuous week
    // grid they share a row, which is the confusion this whole shape exists
    // to remove.
    const [june, july] = monthGrids('2026-06-01', '2026-07-31');
    expect(keys(june.days).at(-1)).toBe('2026-06-30');
    expect(keys(july.days).at(0)).toBe('2026-07-01');
  });

  it('opens a full month on its 1st, under the right weekday', () => {
    const [june] = monthGrids('2026-06-01', '2026-06-30');
    expect(keys(june.days).at(0)).toBe('2026-06-01');
    expect(june.lead).toBe(1); // 1 June 2026 is a Monday
    expect(june.days).toHaveLength(30);
  });

  it('starts on the term\'s first day, with no empty week above it', () => {
    // The reported case: a class starting on the 8th left a blank row where
    // the 1st to the 7th would have been.
    const [june] = monthGrids('2026-06-08', '2026-06-30');
    expect(keys(june.days).at(0)).toBe('2026-06-08');
    expect(june.lead).toBe(1); // 8 June 2026 is a Monday, so one blank cell
    expect(june.days).toHaveLength(23);
  });

  it('stops on the term\'s last day, with no empty weeks below it', () => {
    const grids = monthGrids('2026-06-29', '2026-07-03');
    expect(grids).toHaveLength(2);
    expect(keys(grids[0].days)).toEqual(['2026-06-29', '2026-06-30']);
    expect(keys(grids[1].days)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
    ]);
  });

  it('offsets a partial month by the weekday of the day it actually opens on', () => {
    // 3 July 2026 is a Friday, so five blanks sit before it, not two for the
    // 1st. This is what keeps the columns under the right letters.
    const [july] = monthGrids('2026-07-03', '2026-07-31');
    expect(july.lead).toBe(5);
    expect(keys(july.days).at(0)).toBe('2026-07-03');
  });

  it('gives a Sunday no lead at all, since the week opens on Sunday', () => {
    // 1 November 2026 is a Sunday.
    const [november] = monthGrids('2026-11-01', '2026-11-30');
    expect(november.lead).toBe(0);
  });

  it('handles a term that lives and dies inside one month', () => {
    const grids = monthGrids('2026-06-08', '2026-06-12');
    expect(grids).toHaveLength(1);
    expect(grids[0].label).toBe('June 2026');
    expect(grids[0].lead).toBe(1);
    expect(keys(grids[0].days)).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
    ]);
  });

  it('handles a term of a single day', () => {
    const grids = monthGrids('2026-06-08', '2026-06-08');
    expect(grids).toHaveLength(1);
    expect(keys(grids[0].days)).toEqual(['2026-06-08']);
  });

  it('keeps a February in step, leap year and all', () => {
    const [february] = monthGrids('2028-02-01', '2028-02-29');
    expect(february.days).toHaveLength(29);
    expect(keys(february.days).at(-1)).toBe('2028-02-29');
  });

  it('crosses a new year without losing a month or repeating a label', () => {
    const grids = monthGrids('2026-12-15', '2027-01-15');
    expect(grids.map((g) => g.label)).toEqual(['December 2026', 'January 2027']);
    expect(keys(grids[0].days).at(0)).toBe('2026-12-15');
    expect(keys(grids[1].days).at(-1)).toBe('2027-01-15');
  });

  it('shows nothing at all when the dates are the wrong way round', () => {
    expect(monthGrids('2026-07-01', '2026-06-01')).toEqual([]);
  });

  it('spans a long term without dropping a month in the middle', () => {
    const grids = monthGrids('2026-01-20', '2026-12-05');
    expect(grids).toHaveLength(12);
    // Every month between the ends is whole; only the two ends are clipped.
    expect(grids[0].days).toHaveLength(12); // 20 to 31 January
    expect(grids[1].days).toHaveLength(28); // all of February
    expect(grids.at(-1)!.days).toHaveLength(5); // 1 to 5 December
  });
});

describe('monthGrids guards a runaway range', () => {
  it('draws nothing for a span that is a mistyped year rather than a term', () => {
    expect(monthGrids('2026-01-01', '9999-12-31')).toEqual([]);
  });

  it('still draws a long but plausible course', () => {
    expect(monthGrids('2026-01-01', '2028-12-31').length).toBe(36);
  });
});

describe('toDateKey / fromDateKey', () => {
  it('round-trips a local date through its key', () => {
    const d = new Date(2026, 8, 7, 14, 30); // 7 Sep 2026, afternoon
    expect(toDateKey(d)).toBe('2026-09-07');
    expect(toDateKey(fromDateKey('2026-09-07'))).toBe('2026-09-07');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('keys by the local date, not the UTC one', () => {
    // A key is a calendar day, not an instant. Going through toISOString here
    // would name the previous day anywhere ahead of Greenwich, and a class
    // marked late in the evening would land on yesterday.
    expect(toDateKey(new Date(2026, 8, 7, 23, 59))).toBe('2026-09-07');
    expect(toDateKey(new Date(2026, 8, 7, 0, 1))).toBe('2026-09-07');
  });

  it('parses a key to local midnight, so the day never shifts back', () => {
    const parsed = fromDateKey('2026-09-07');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(7);
    expect(parsed.getHours()).toBe(0);
  });

  it('orders as a string exactly as it orders as a date', () => {
    // Everything downstream compares keys with < and >, so this is the property
    // the whole date layer leans on.
    const keys = ['2026-01-31', '2026-02-01', '2026-09-07', '2026-10-01', '2027-01-01'];
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1] < keys[i]).toBe(true);
      expect(fromDateKey(keys[i - 1]) < fromDateKey(keys[i])).toBe(true);
    }
  });

  it('handles a leap day', () => {
    expect(toDateKey(new Date(2028, 1, 29))).toBe('2028-02-29');
    expect(fromDateKey('2028-02-29').getDate()).toBe(29);
  });
});

describe('the display formats', () => {
  it('writes a session date as a weekday and a short month', () => {
    expect(formatSessionDate('2026-09-07')).toBe('Mon, 7 Sep');
  });

  it('writes a long date without padding the day', () => {
    expect(formatLongDate('2026-09-07')).toBe('7 September 2026');
    expect(formatLongDate('2026-12-25')).toBe('25 December 2026');
  });

  it('labels a month with its year, so a two-term range never reads ambiguously', () => {
    expect(formatMonthLabel(new Date(2026, 8, 1))).toBe('September 2026');
    expect(formatMonthLabel(new Date(2027, 0, 15))).toBe('January 2027');
  });

  it('formats from the key rather than from an instant', () => {
    // Same guard as toDateKey, from the other direction: a formatter that went
    // through UTC would print the day before.
    expect(formatSessionDate('2026-01-01')).toBe('Thu, 1 Jan');
    expect(formatLongDate('2026-01-01')).toBe('1 January 2026');
  });
});

describe('the weekday tables', () => {
  it('index by getDay(), Sunday first', () => {
    expect(DAY_LABELS).toHaveLength(7);
    expect(DAY_LABELS_SHORT).toHaveLength(7);
    expect(DAY_LABELS[0]).toBe('Sun');
    expect(DAY_LABELS[6]).toBe('Sat');
    // 7 September 2026 is a Monday.
    expect(DAY_LABELS[fromDateKey('2026-09-07').getDay()]).toBe('Mon');
  });

  it('abbreviate to the first letter of the long label', () => {
    DAY_LABELS.forEach((label, i) => {
      expect(DAY_LABELS_SHORT[i]).toBe(label[0]);
    });
  });

  it('offer the day toggles Monday first, covering every day exactly once', () => {
    expect(WEEK_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(new Set(WEEK_ORDER).size).toBe(7);
    expect([...WEEK_ORDER].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('todayKey and nowIso', () => {
  it('give today as a key that fromDateKey reads back', () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toDateKey(fromDateKey(key))).toBe(key);
    expect(key).toBe(toDateKey(new Date()));
  });

  it('stamp the moment in UTC ISO, which is what the rows store', () => {
    const iso = nowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Math.abs(Date.parse(iso) - Date.now())).toBeLessThan(5_000);
  });
});
