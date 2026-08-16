import { useMemo } from 'react';
import {
  toDateKey,
  monthGrids,
  formatSessionDate,
  DAY_LABELS_SHORT,
} from '../../utils/dates';
import { hexToRgba, readableTextColor, ABSENT_COLOR } from '../../lib/colors';
import { STATUS_LABEL } from '../../lib/status';
import { classesOnDay, daysOff, type DayClass } from '../../lib/calculations';
import { slotOf } from '../../lib/slots';
import type { Course, Session } from '../../types';

interface AttendanceHeatmapProps {
  course: Course;
  semesterStart: string;
  semesterEnd: string;
  sessions: Session[];
  /**
   * The tapped day, as every class it holds: the unmarked half of a double is
   * in there too, so it can still be reached from the grid.
   */
  onSelectDate: (dateKey: string, classes: DayClass[]) => void;
}

/** How one class of a day is painted: its fill and the ink that reads on it. */
interface Band {
  background: string;
  text: string;
  cancelled: boolean;
}

const CANCELLED_FILL = '#E0DCD2';
const MUTED_INK = '#6B6960';

/**
 * A day that holds two classes is painted in two: half attended, half missed
 * reads as exactly that. Days with a single class keep a plain flat fill.
 */
function bandsBackground(bands: Band[]): string {
  if (bands.length === 1) return bands[0].background;
  const step = 100 / bands.length;
  const stops = bands.flatMap((b, i) => [
    `${b.background} ${i * step}%`,
    `${b.background} ${(i + 1) * step}%`,
  ]);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function AttendanceHeatmap({
  course,
  semesterStart,
  semesterEnd,
  sessions,
  onSelectDate,
}: AttendanceHeatmapProps) {
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = map.get(s.scheduled_date) ?? [];
      list.push(s);
      map.set(s.scheduled_date, list);
    }
    for (const list of map.values()) list.sort((a, b) => slotOf(a) - slotOf(b));
    return map;
  }, [sessions]);

  // One grid per month, holding only the days the term covers, so a term that
  // starts on the 8th or ends mid-month leaves no empty week in the grid.
  const months = useMemo(
    () => monthGrids(semesterStart, semesterEnd),
    [semesterStart, semesterEnd]
  );

  const off = useMemo(() => new Set(daysOff(course)), [course]);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DAY_LABELS_SHORT.map((label, i) => (
          <div
            key={i}
            className="text-center font-sans text-[10px] font-medium text-ink-300"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {months.map(({ label, lead, days }) => {
          return (
            <div key={label}>
              <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300">
                {label}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: lead }, (_, i) => (
                  <div key={`lead-${i}`} aria-hidden />
                ))}
                {days.map((day) => {
                  const key = toDateKey(day);
                  const dayOff = off.has(key);
                  // The day's shape is the app's one answer to what a day
                  // holds, so the grid reads it rather than working it out.
                  const classes = classesOnDay(
                    course,
                    key,
                    sessionsByDate.get(key) ?? []
                  );

                  // One band per class of the day, in order.
                  const bands: Band[] = classes.map(({ session }) => {
                    if (session?.status === 'present') {
                      return {
                        background: course.color,
                        text: readableTextColor(course.color),
                        cancelled: false,
                      };
                    }
                    if (session?.status === 'absent') {
                      return {
                        background: ABSENT_COLOR,
                        text: readableTextColor(ABSENT_COLOR),
                        cancelled: false,
                      };
                    }
                    if (session?.status === 'cancelled') {
                      return {
                        background: CANCELLED_FILL,
                        text: MUTED_INK,
                        cancelled: true,
                      };
                    }
                    return {
                      background: hexToRgba(course.color, 0.12),
                      text: MUTED_INK,
                      cancelled: false,
                    };
                  });

                  let background: string;
                  let color: string;
                  let ring: string | undefined;
                  const struck =
                    bands.length > 0 && bands.every((b) => b.cancelled);

                  if (bands.length > 0) {
                    background = bandsBackground(bands);
                    // White ink only when it reads on every band; a day split
                    // between a dark fill and a pale one takes the dark ink.
                    color = bands.every((b) => b.text === '#FFFFFF')
                      ? '#FFFFFF'
                      : bands.length > 1
                        ? '#1A1A18'
                        : bands[0].text;
                  } else if (dayOff) {
                    // A day the class was taken off: hollow where a class would
                    // otherwise have been filled in.
                    background = '#F0EDE6';
                    color = '#9B9890';
                    ring = `inset 0 0 0 1px ${hexToRgba(course.color, 0.28)}`;
                  } else {
                    background = '#F0EDE6';
                    color = '#9B9890';
                  }

                  const interactive = classes.length > 0 || dayOff;
                  const status =
                    classes.length > 0
                      ? classes
                          .map(({ session }) =>
                            session ? STATUS_LABEL[session.status] : 'Not marked'
                          )
                          .join(', ')
                      : dayOff
                        ? 'No class'
                        : null;
                  const description = `${formatSessionDate(key)}${
                    status ? `: ${status}` : ''
                  }`;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSelectDate(key, classes)}
                      title={description}
                      aria-label={description}
                      style={{ background, color, boxShadow: ring }}
                      className={`flex aspect-square items-center justify-center rounded-[4px] font-sans text-[11px] leading-none tabular-nums ${
                        struck ? 'line-through' : ''
                      } ${interactive ? '' : 'cursor-default'}`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans text-[10px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: course.color }}
          />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: ABSENT_COLOR }}
          />
          Absent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative h-3 w-3 rounded-[3px] bg-parchment-300">
            <span className="absolute inset-x-0.5 top-1/2 h-px -translate-y-1/2 bg-ink-500" />
          </span>
          Cancelled
        </span>
        {off.size > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-[3px] bg-parchment-200"
              style={{ boxShadow: `inset 0 0 0 1px ${hexToRgba(course.color, 0.28)}` }}
            />
            Day off
          </span>
        )}
      </div>
    </div>
  );
}
