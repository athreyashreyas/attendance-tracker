import { hexToRgba } from '../../lib/colors';

interface ProgressTicksProps {
  done: number;
  total: number;
  color: string; // the item's own colour, not a status tone
  label: string; // what the row says, for screen readers and on hover
  className?: string;
}

/**
 * A row of tally ticks, one per unit, inked in as each one passes.
 *
 * Deliberately not a bar: a filled rule reads as a loading indicator, and the
 * card already carries a ProgressRing, so the second measure has to be a
 * different kind of mark. Ticks are countable at a glance for a normal term and
 * settle into a fine ruler for a long one.
 *
 * Drawn in the item's own colour, softened, so it never reads as a status
 * (rose/amber/sage are reserved for that) nor as the solid fills the calendar
 * heatmap uses for attendance. Ticks recolour on a transition, so marking a
 * class inks its tick in rather than snapping it.
 */
export function ProgressTicks({
  done,
  total,
  color,
  label,
  className = '',
}: ProgressTicksProps) {
  if (total <= 0) return null;

  const passed = Math.min(Math.max(done, 0), total);
  // Long terms need the gap to give way so the ticks keep some width of their own.
  const gap = total > 45 ? 1 : total > 28 ? 2 : 3;

  return (
    <div
      className={`flex items-end ${className}`}
      style={{ gap }}
      role="img"
      aria-label={label}
      title={label}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="h-2.5 min-w-0 flex-1 rounded-sm transition-colors duration-500"
          style={{
            maxWidth: 4,
            backgroundColor: i < passed ? hexToRgba(color, 0.7) : '#E0DCD2',
          }}
        />
      ))}
    </div>
  );
}
