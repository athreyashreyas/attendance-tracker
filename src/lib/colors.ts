export const COURSE_COLORS = [
  { label: 'Sage', hex: '#4F7942' },
  { label: 'Slate', hex: '#4A6B8A' },
  { label: 'Amber', hex: '#B8782A' },
  { label: 'Rose', hex: '#9B4A6B' },
  { label: 'Teal', hex: '#2A8A7B' },
  { label: 'Plum', hex: '#6B4A9B' },
  { label: 'Terracotta', hex: '#A85B3E' },
  { label: 'Graphite', hex: '#4A4A4A' },
] as const;

export const DEFAULT_COURSE_COLOR = COURSE_COLORS[0].hex;

export const STATUS_COLORS = {
  green: '#4F7942',
  amber: '#C98F3E',
  rose: '#B85C72',
} as const;

/**
 * Colour for an attendance percentage relative to its threshold:
 *  - below threshold       -> rose
 *  - within 5% of threshold -> amber
 *  - otherwise              -> sage green
 */
export function attendanceColor(pct: number, threshold: number): string {
  if (pct < threshold) return STATUS_COLORS.rose;
  if (pct < threshold + 5) return STATUS_COLORS.amber;
  return STATUS_COLORS.green;
}

/** Translate a hex colour to an rgba() string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
