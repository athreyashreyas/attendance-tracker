import type { ViewFilter } from '../../stores/uiStore';
import type { Semester } from '../../types';

interface ViewFilterBarProps {
  filter: ViewFilter;
  onChange: (filter: ViewFilter) => void;
  semesters: Semester[];
  /** Hide the "Other" pill when there are no standalone classes to show. */
  hasStandalone: boolean;
}

/**
 * Horizontal pills that drive the current view: All · each semester · Other.
 * Shared by the dashboard and the calendar.
 */
export function ViewFilterBar({
  filter,
  onChange,
  semesters,
  hasStandalone,
}: ViewFilterBarProps) {
  // Nothing to switch between if there are no semesters and no standalone split.
  if (semesters.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip label="All" active={filter === 'all'} onClick={() => onChange('all')} />
      {semesters.map((s) => (
        <Chip
          key={s.id}
          label={s.name}
          active={filter === s.id}
          onClick={() => onChange(s.id)}
        />
      ))}
      {hasStandalone && (
        <Chip
          label="Other"
          active={filter === 'other'}
          onClick={() => onChange('other')}
        />
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 font-sans text-sm font-medium transition-colors ${
        active ? 'bg-sage-500 text-white' : 'bg-parchment-200 text-ink-500'
      }`}
    >
      {label}
    </button>
  );
}
