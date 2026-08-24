import { describe, expect, it } from 'vitest';
import {
  ABSENT_COLOR,
  COURSE_COLORS,
  DEFAULT_COURSE_COLOR,
  STATUS_COLORS,
  attendanceColor,
  hexToRgba,
  readableTextColor,
} from './colors';

/** WCAG contrast ratio between two hex colours, for checking legibility. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const clean = hex.replace('#', '');
    const channel = (i: number) => {
      const v = parseInt(clean.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Straight-line distance between two hex colours in RGB, for separation. */
function distance(a: string, b: string): number {
  const rgb = (hex: string) => {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  };
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

describe('attendanceColor', () => {
  it('is rose below the threshold', () => {
    expect(attendanceColor(70, 75)).toBe(STATUS_COLORS.rose);
    expect(attendanceColor(0, 75)).toBe(STATUS_COLORS.rose);
  });

  it('is amber in the five points just above it', () => {
    // Level with the threshold is not comfortable — one missed class and it is
    // gone — so the warning starts the moment you are no longer below it.
    expect(attendanceColor(75, 75)).toBe(STATUS_COLORS.amber);
    expect(attendanceColor(79.9, 75)).toBe(STATUS_COLORS.amber);
  });

  it('is green once there is real headroom', () => {
    expect(attendanceColor(80, 75)).toBe(STATUS_COLORS.green);
    expect(attendanceColor(100, 75)).toBe(STATUS_COLORS.green);
  });

  it('moves its bands with the threshold, not with a fixed number', () => {
    // A course needing 90% is at risk at 88%, where one needing 75% is fine.
    expect(attendanceColor(88, 90)).toBe(STATUS_COLORS.rose);
    expect(attendanceColor(88, 75)).toBe(STATUS_COLORS.green);
  });

  it('copes with a threshold of zero, where nothing can be at risk', () => {
    expect(attendanceColor(0, 0)).toBe(STATUS_COLORS.amber);
    expect(attendanceColor(50, 0)).toBe(STATUS_COLORS.green);
  });
});

describe('the course palette', () => {
  it('offers sixteen swatches, each with a label and a hex', () => {
    expect(COURSE_COLORS).toHaveLength(16);
    for (const c of COURSE_COLORS) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('repeats neither a hex nor a label, so every course reads as its own', () => {
    const hexes = COURSE_COLORS.map((c) => c.hex);
    const labels = COURSE_COLORS.map((c) => c.label);
    expect(new Set(hexes).size).toBe(16);
    expect(new Set(labels).size).toBe(16);
  });

  it('has the default in the palette, whatever order the palette is in', () => {
    expect(COURSE_COLORS.some((c) => c.hex === DEFAULT_COURSE_COLOR)).toBe(true);
    expect(COURSE_COLORS.find((c) => c.hex === DEFAULT_COURSE_COLOR)?.label).toBe('Sage');
  });

  it('keeps the absent fill clear of every course hue', () => {
    // The heatmap is single-hue per course, so an absent cell that collided
    // with a course colour would be unreadable for that course. The bar it has
    // to clear: sit farther from every course colour than the two closest
    // course colours sit from each other.
    // Compared as widened strings: the `as const` palette gives each swatch a
    // literal type, so TypeScript would otherwise reject this as a comparison
    // it has already proved can never hold — which is itself the guarantee.
    const courseHexes: string[] = COURSE_COLORS.map((c) => c.hex);
    expect(courseHexes).not.toContain(ABSENT_COLOR as string);

    let closestPair = Infinity;
    for (let i = 0; i < COURSE_COLORS.length; i++) {
      for (let j = i + 1; j < COURSE_COLORS.length; j++) {
        closestPair = Math.min(closestPair, distance(COURSE_COLORS[i].hex, COURSE_COLORS[j].hex));
      }
    }
    for (const c of COURSE_COLORS) {
      expect(distance(c.hex, ABSENT_COLOR)).toBeGreaterThan(closestPair);
    }
  });
});

describe('readableTextColor', () => {
  it('puts ink on a light fill and white on a dark one', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#1A1A18');
    expect(readableTextColor('#000000')).toBe('#FFFFFF');
  });

  it('picks whichever of the two actually reads better, on every course colour', () => {
    // The heatmap paints day numbers over sixteen course colours plus the
    // absent grey, so the text colour has to be derived rather than fixed.
    for (const c of [...COURSE_COLORS.map((x) => x.hex), ABSENT_COLOR]) {
      const chosen = readableTextColor(c);
      const other = chosen === '#FFFFFF' ? '#1A1A18' : '#FFFFFF';
      expect(contrast(chosen, c)).toBeGreaterThanOrEqual(contrast(other, c));
    }
  });

  it('clears 3:1 on every fill it will actually be painted on', () => {
    // Day numbers are small but bold; 3:1 is the floor at which they stay
    // legible rather than merely visible.
    for (const c of [...COURSE_COLORS.map((x) => x.hex), ABSENT_COLOR]) {
      expect(contrast(readableTextColor(c), c)).toBeGreaterThan(3);
    }
  });

  it('reads a hex with or without the leading hash', () => {
    expect(readableTextColor('4F7942')).toBe(readableTextColor('#4F7942'));
  });

  it('returns one of exactly two colours, never something in between', () => {
    for (const c of COURSE_COLORS) {
      expect(['#FFFFFF', '#1A1A18']).toContain(readableTextColor(c.hex));
    }
  });
});

describe('hexToRgba', () => {
  it('splits the channels in the right order', () => {
    expect(hexToRgba('#4F7942', 1)).toBe('rgba(79, 121, 66, 1)');
    expect(hexToRgba('#FF0000', 1)).toBe('rgba(255, 0, 0, 1)');
    expect(hexToRgba('#0000FF', 1)).toBe('rgba(0, 0, 255, 1)');
  });

  it('carries the alpha through verbatim', () => {
    expect(hexToRgba('#000000', 0.15)).toBe('rgba(0, 0, 0, 0.15)');
    expect(hexToRgba('#FFFFFF', 0)).toBe('rgba(255, 255, 255, 0)');
  });

  it('reads a hex with or without the leading hash', () => {
    expect(hexToRgba('4F7942', 0.5)).toBe(hexToRgba('#4F7942', 0.5));
  });

  it('handles every swatch it will ever be given', () => {
    for (const c of [...COURSE_COLORS.map((x) => x.hex), ABSENT_COLOR, ...Object.values(STATUS_COLORS)]) {
      expect(hexToRgba(c, 0.2)).toMatch(/^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0\.2\)$/);
    }
  });
});

describe('STATUS_COLORS', () => {
  it('gives each tone its own hex', () => {
    const hexes = Object.values(STATUS_COLORS);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('uses the brand sage for the healthy tone', () => {
    expect(STATUS_COLORS.green).toBe(DEFAULT_COURSE_COLOR);
  });
});
