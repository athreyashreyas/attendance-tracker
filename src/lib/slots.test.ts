import { describe, expect, it } from 'vitest';
import {
  MAX_CLASSES_PER_DAY,
  normalizeCount,
  ordinal,
  slotLabel,
  slotOf,
} from './slots';
import { makeSession } from './test-factories';
import type { Session } from '../types';

describe('slotOf', () => {
  it('reads the slot a session was recorded in', () => {
    expect(slotOf(makeSession('c', '2026-09-07', 'present', { slot: 2 }))).toBe(2);
  });

  it('treats a row written before slots existed as the first class', () => {
    const legacy = makeSession('c', '2026-09-07', 'present');
    // Rows synced from before the column existed carry no slot at all.
    delete (legacy as Partial<Session>).slot;
    expect(slotOf(legacy)).toBe(1);
  });

  it('refuses nonsense rather than propagating it', () => {
    const bad = (slot: unknown) =>
      slotOf({
        ...makeSession('c', '2026-09-07', 'present'),
        slot,
      } as unknown as Session);
    expect(bad(0)).toBe(1);
    expect(bad(-3)).toBe(1);
    expect(bad(null)).toBe(1);
    expect(bad('nope')).toBe(1);
    expect(bad(2.7)).toBe(2); // floored, not rounded up
  });
});

describe('normalizeCount', () => {
  it('treats anything at or below one as one class', () => {
    expect(normalizeCount(1)).toBe(1);
    expect(normalizeCount(0)).toBe(1);
    expect(normalizeCount(-2)).toBe(1);
    expect(normalizeCount(undefined)).toBe(1);
    expect(normalizeCount('')).toBe(1);
  });

  it('keeps a real count, and caps a day at something a day could hold', () => {
    expect(normalizeCount(2)).toBe(2);
    expect(normalizeCount('3')).toBe(3);
    expect(normalizeCount(99)).toBe(MAX_CLASSES_PER_DAY);
  });
});

describe('ordinal', () => {
  it('names a position in English, including the teens', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(103)).toBe('103rd');
    expect(ordinal(111)).toBe('111th');
  });
});

describe('slotLabel', () => {
  it('says nothing when a day holds a single class', () => {
    expect(slotLabel(1, 1)).toBeNull();
  });

  it('names each class of a day that holds several', () => {
    expect(slotLabel(1, 2)).toBe('1st of 2');
    expect(slotLabel(2, 2)).toBe('2nd of 2');
    expect(slotLabel(3, 3)).toBe('3rd of 3');
  });
});
