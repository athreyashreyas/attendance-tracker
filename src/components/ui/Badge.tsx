import type { ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'rose' | 'neutral';

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  green: 'bg-sage-100 text-sage-700',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  neutral: 'bg-parchment-200 text-ink-500',
};

export function Badge({ tone = 'neutral', children, icon, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
