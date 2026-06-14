// A muted spectrum, spaced around the wheel so every swatch is clearly its own,
// while staying soft enough to sit warmly on the parchment theme.
export const COURSE_COLORS = [
  { label: 'Sage', hex: '#4F7942' },
  { label: 'Emerald', hex: '#2F8062' },
  { label: 'Teal', hex: '#2E8A8A' },
  { label: 'Ocean', hex: '#357F9B' },
  { label: 'Blue', hex: '#3C5F9A' },
  { label: 'Indigo', hex: '#4A4E94' },
  { label: 'Violet', hex: '#6A4AA0' },
  { label: 'Plum', hex: '#8A3F7A' },
  { label: 'Rose', hex: '#A8436A' },
  { label: 'Crimson', hex: '#B23B43' },
  { label: 'Terracotta', hex: '#AF573C' },
  { label: 'Amber', hex: '#BE7A2E' },
  { label: 'Marigold', hex: '#C29A24' },
  { label: 'Olive', hex: '#83863A' },
  { label: 'Graphite', hex: '#4A4A4A' },
  { label: 'Storm', hex: '#64707E' },
] as const;

// Sage is the brand tone; keep it the default regardless of array order.
export const DEFAULT_COURSE_COLOR = '#4F7942';

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
