import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, left, right }: PageHeaderProps) {
  return (
    <header className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {left}
          <h1 className="truncate font-serif text-2xl leading-tight text-ink-900">
            {title}
          </h1>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {subtitle && (
        <p className="mt-0.5 truncate font-sans text-sm text-ink-500">
          {subtitle}
        </p>
      )}
    </header>
  );
}
