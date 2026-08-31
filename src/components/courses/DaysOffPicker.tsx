import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarRange, Hand, RotateCcw } from 'lucide-react';
import { toDateKey, fromDateKey, DAY_LABELS_SHORT } from '../../utils/dates';
import { hexToRgba } from '../../lib/colors';
import { classesOnDateIn } from '../../lib/schedule';
import type { SchedulePeriod } from '../../types';

type Mode = 'single' | 'range';

interface DaysOffPickerProps {
  /**
   * The class's timetable over time. A term whose days moved partway through
   * offers the days it actually ran on either side of the change, rather than
   * the newest timetable's days for the whole term.
   */
  periods: SchedulePeriod[];
  /** First and last class, 'YYYY-MM-DD'. */
  start: string;
  end: string;
  /** Dates currently marked off. */
  value: string[];
  onChange: (next: string[]) => void;
  color: string;
}

/**
 * A term laid out month by month, where every class day can be switched off.
 * Single taps handle the odd holiday; range mode knocks out a whole break in
 * two taps. Only real class days respond — the rest of the calendar is there
 * for orientation, so a date can be found the way it appears on a wall planner.
 */
export function DaysOffPicker({
  periods,
  start,
  end,
  value,
  onChange,
  color,
}: DaysOffPickerProps) {
  const [mode, setMode] = useState<Mode>('single');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const off = useMemo(() => new Set(value), [value]);

  // Every month the term touches, each padded out to whole weeks.
  const months = useMemo(() => {
    if (!start || !end || end < start) return [];
    const out: { label: string; days: Date[] }[] = [];
    const cursor = startOfMonth(fromDateKey(start));
    const last = startOfMonth(fromDateKey(end));
    while (cursor <= last) {
      out.push({
        label: format(cursor, 'MMMM yyyy'),
        days: eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }),
          end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }),
        }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [start, end]);

  function isClassDay(day: Date): boolean {
    const key = toDateKey(day);
    return key >= start && key <= end && classesOnDateIn(periods, key) > 0;
  }

  function classDaysBetween(a: string, b: string): string[] {
    const [from, to] = a <= b ? [a, b] : [b, a];
    return eachDayOfInterval({ start: fromDateKey(from), end: fromDateKey(to) })
      .filter(isClassDay)
      .map(toDateKey);
  }

  function toggleOne(key: string) {
    onChange(off.has(key) ? value.filter((d) => d !== key) : [...value, key]);
  }

  function handleTap(day: Date) {
    const key = toDateKey(day);
    if (mode === 'single') {
      toggleOne(key);
      return;
    }
    if (!anchor) {
      setAnchor(key);
      return;
    }
    const span = classDaysBetween(anchor, key);
    // A range that's already entirely off reads as "put these back".
    const allOff = span.every((d) => off.has(d));
    onChange(
      allOff
        ? value.filter((d) => !span.includes(d))
        : [...value.filter((d) => !span.includes(d)), ...span]
    );
    setAnchor(null);
    setHovered(null);
  }

  // Dates the in-progress range would cover, for the live preview.
  const pending = useMemo(() => {
    if (mode !== 'range' || !anchor) return new Set<string>();
    return new Set(hovered ? classDaysBetween(anchor, hovered) : [anchor]);
  }, [mode, anchor, hovered, value, start, end, periods]);

  if (months.length === 0) {
    return (
      <p className="rounded-card bg-parchment-200 px-3.5 py-3 font-sans text-sm text-ink-500">
        Set the first and last class above, and the term will appear here for you
        to mark days off.
      </p>
    );
  }

  if (periods.every((p) => p.days.length === 0)) {
    return (
      <p className="rounded-card bg-parchment-200 px-3.5 py-3 font-sans text-sm text-ink-500">
        Pick your class days above, and you can then take individual days out of
        the term.
      </p>
    );
  }

  return (
    <div className="rounded-card bg-parchment-100 p-3">
      <div className="mb-3 flex gap-1.5 rounded-lg bg-parchment-200 p-1">
        <ModeTab
          active={mode === 'single'}
          onClick={() => {
            setMode('single');
            setAnchor(null);
          }}
          icon={<Hand size={14} />}
          label="Single days"
        />
        <ModeTab
          active={mode === 'range'}
          onClick={() => {
            setMode('range');
            setAnchor(null);
          }}
          icon={<CalendarRange size={14} />}
          label="A whole break"
        />
      </div>

      <p className="mb-3 font-sans text-xs text-ink-500">
        {mode === 'single'
          ? 'Tap any class day to take it out of the term.'
          : anchor
            ? `Starting ${format(
                fromDateKey(anchor),
                'd MMM'
              )}. Now tap the last day of the break.`
            : 'Tap the first day of the break.'}
      </p>

      <div className="scroll-ios max-h-[19rem] overflow-y-auto pr-0.5">
        <div className="sticky top-0 z-10 grid grid-cols-7 gap-1 bg-parchment-100 pb-1.5">
          {DAY_LABELS_SHORT.map((label, i) => (
            <div
              key={i}
              className="text-center font-sans text-[10px] font-medium text-ink-300"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {months.map((month) => (
            <div key={month.label}>
              <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
                {month.label}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {month.days.map((day) => {
                  const key = toDateKey(day);
                  const inMonth = format(day, 'MMMM yyyy') === month.label;
                  const classDay = isClassDay(day);
                  const isOff = off.has(key);
                  const inPending = pending.has(key);

                  if (!classDay) {
                    return (
                      <div
                        key={key}
                        className={`flex aspect-square items-center justify-center rounded-md font-sans text-[11px] tabular-nums ${
                          inMonth ? 'text-ink-100' : 'text-transparent'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    );
                  }

                  return (
                    <motion.button
                      key={key}
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => handleTap(day)}
                      onPointerEnter={() =>
                        mode === 'range' && anchor && setHovered(key)
                      }
                      aria-pressed={isOff}
                      aria-label={`${format(day, 'EEEE d MMMM')}${
                        isOff ? ', no class' : ''
                      }`}
                      style={
                        isOff
                          ? undefined
                          : { backgroundColor: hexToRgba(color, 0.16) }
                      }
                      className={`flex aspect-square items-center justify-center rounded-md font-sans text-[11px] font-medium tabular-nums transition-colors ${
                        isOff
                          ? 'bg-parchment-300 text-ink-300 line-through'
                          : 'text-ink-900'
                      } ${inPending ? 'ring-2 ring-inset ring-sage-500' : ''}`}
                    >
                      {day.getDate()}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onChange([]);
            setAnchor(null);
          }}
          className="mt-3 flex items-center gap-1.5 font-sans text-xs font-medium text-ink-500"
        >
          <RotateCcw size={13} />
          Put back all {value.length} {value.length === 1 ? 'day' : 'days'}
        </button>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-sans text-xs font-medium transition-colors ${
        active ? 'bg-parchment-50 text-ink-900 shadow-sm' : 'text-ink-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
