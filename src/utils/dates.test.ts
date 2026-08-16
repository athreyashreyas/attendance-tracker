import { describe, expect, it } from 'vitest';
import { monthGrids, toDateKey } from './dates';

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
