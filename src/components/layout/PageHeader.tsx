import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, left, right }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {left}
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl leading-tight text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate font-sans text-sm text-ink-500">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 pt-1">{right}</div>}
    </header>
  );
}
