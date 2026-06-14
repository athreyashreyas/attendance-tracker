import { Check, X, CircleSlash, type LucideIcon } from 'lucide-react';
import type { SessionStatus } from '../types';

/** Human label for each session status. */
export const STATUS_LABEL: Record<SessionStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  cancelled: 'Cancelled',
};

/** Status picker options (icon + the active colour classes). */
export const STATUS_OPTIONS: {
  value: SessionStatus;
  label: string;
  icon: LucideIcon;
  active: string;
}[] = [
  { value: 'present', label: 'Present', icon: Check, active: 'bg-sage-500 text-white' },
  { value: 'absent', label: 'Absent', icon: X, active: 'bg-rose-500 text-white' },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: CircleSlash,
    active: 'bg-ink-500 text-white',
  },
];

/** Tone of a callout (good / close / at-risk) → background + text classes. */
export type CalloutTone = 'sage' | 'amber' | 'rose';

export const TONE_CLASSES: Record<CalloutTone, string> = {
  sage: 'bg-sage-100 text-sage-700',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
};
