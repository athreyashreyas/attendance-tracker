import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ABSENT_COLOR, hexToRgba } from '../../lib/colors';

interface TermSummaryProps {
  present: number;
  absent: number;
  remaining: number;
  cancelled: number;
  color: string; // the class's own colour
}

const SIZE = 128;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
// A hair of empty space between neighbouring slices, as a fraction of the
// circle, so the two settled slices read as separate pieces rather than one.
const SLICE_GAP = 0.008;

/**
 * The term as a single pie: how much of it has happened, split into the classes
 * attended and the ones missed, with the rest of the circle left open for what
 * is still to come.
 *
 * It answers a different question from the attendance ring above it (which is
 * present-out-of-settled), so it is drawn differently on purpose: thick slices
 * in the class's own colour rather than a thin threshold-tinted arc.
 */
export function TermSummary({
  present,
  absent,
  remaining,
  cancelled,
  color,
}: TermSummaryProps) {
  const total = present + absent + remaining;
  const done = present + absent;
  const pct = total > 0 ? (done / total) * 100 : 0;

  // Count the centre figure up rather than snapping it, the same spring the
  // attendance ring uses.
  const target = useMotionValue(0);
  const animated = useSpring(target, { stiffness: 120, damping: 20 });
  const display = useTransform(animated, (v) => `${Math.round(v)}%`);
  useEffect(() => {
    target.set(pct);
  }, [pct, target]);

  if (total === 0) return null;

  const presentFrac = present / total;
  const absentFrac = absent / total;
  // Only carve a gap where two slices actually meet.
  const gap = present > 0 && absent > 0 ? SLICE_GAP : 0;

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-sans text-base font-medium text-ink-900">
        This term
      </h2>

      <div className="flex items-center gap-6 rounded-card bg-parchment-50 p-5 shadow-sm">
        <div
          className="relative shrink-0"
          style={{ width: SIZE, height: SIZE }}
          role="img"
          aria-label={`${done} of ${total} classes done, ${Math.round(pct)} percent of the term`}
        >
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="#F0EDE6"
              strokeWidth={STROKE}
            />
            <Slice
              length={Math.max(presentFrac - gap / 2, 0)}
              offset={0}
              color={hexToRgba(color, 0.85)}
              delay={0}
            />
            <Slice
              length={Math.max(absentFrac - gap / 2, 0)}
              offset={presentFrac + gap / 2}
              color={ABSENT_COLOR}
              delay={0.08}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span className="font-serif text-2xl leading-none text-ink-900">
              {display}
            </motion.span>
            <span className="mt-1 font-sans text-[10px] text-ink-500">
              of the term
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <LegendRow
            swatch={hexToRgba(color, 0.85)}
            count={present}
            label="attended"
          />
          <LegendRow swatch={ABSENT_COLOR} count={absent} label="missed" />
          <LegendRow swatch="#F0EDE6" count={remaining} label="still to come" />
          {cancelled > 0 && (
            <p className="pt-0.5 font-sans text-xs text-ink-300">
              {cancelled} cancelled, not counted
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** One slice of the pie, swept in clockwise from where the last one ended. */
function Slice({
  length,
  offset,
  color,
  delay,
}: {
  length: number;
  offset: number;
  color: string;
  delay: number;
}) {
  if (length <= 0) return null;
  return (
    <motion.circle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      initial={{ pathLength: 0, pathOffset: offset }}
      animate={{ pathLength: length, pathOffset: offset }}
      // The soft spring the progress ring uses, staggered so the slices land
      // one after the other rather than together.
      transition={{ type: 'spring', stiffness: 120, damping: 20, delay }}
    />
  );
}

function LegendRow({
  swatch,
  count,
  label,
}: {
  swatch: string;
  count: number;
  label: string;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span
        className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-full ring-1 ring-inset ring-black/5"
        style={{ backgroundColor: swatch }}
      />
      <p className="font-sans text-sm text-ink-700">
        <span className="font-serif text-lg text-ink-900">{count}</span> {label}
      </p>
    </div>
  );
}
