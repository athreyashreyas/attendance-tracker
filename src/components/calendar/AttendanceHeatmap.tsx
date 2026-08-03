import { Fragment, useMemo } from 'react';
import { eachDayOfInterval, startOfWeek, endOfWeek, format } from 'date-fns';
import {
  toDateKey,
  fromDateKey,
  formatSessionDate,
  DAY_LABELS_SHORT,
} from '../../utils/dates';
import { hexToRgba, readableTextColor, ABSENT_COLOR } from '../../lib/colors';
import { STATUS_LABEL } from '../../lib/status';
import { daysOff } from '../../lib/calculations';
import type { Course, Session, ScheduleDay } from '../../types';

interface AttendanceHeatmapProps {
  course: Course;
  semesterStart: string;
  semesterEnd: string;
  sessions: Session[];
  onSelectDate: (dateKey: string, session: Session | undefined) => void;
}

export function AttendanceHeatmap({
  course,
  semesterStart,
  semesterEnd,
  sessions,
  onSelectDate,
}: AttendanceHeatmapProps) {
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session>();
    for (const s of sessions) map.set(s.scheduled_date, s);
    return map;
  }, [sessions]);

  const weeks = useMemo(() => {
    const start = startOfWeek(fromDateKey(semesterStart), { weekStartsOn: 0 });
    const end = endOfWeek(fromDateKey(semesterEnd), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [semesterStart, semesterEnd]);

  const rangeStart = semesterStart;
  const rangeEnd = semesterEnd;

  const off = useMemo(() => new Set(daysOff(course)), [course]);

  // Day numbers alone are ambiguous in a continuous week grid, so each week that
  // opens a new month carries its name above it.
  function monthLabel(week: Date[], index: number): string | null {
    if (index === 0) return format(fromDateKey(semesterStart), 'MMMM yyyy');
    const firstOfMonth = week.find((d) => d.getDate() === 1);
    return firstOfMonth ? format(firstOfMonth, 'MMMM yyyy') : null;
  }

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

      <div className="space-y-1.5">
        {weeks.map((week, index) => {
          const label = monthLabel(week, index);
          return (
            <Fragment key={toDateKey(week[0])}>
              {label && (
                <p
                  className={`font-sans text-[10px] font-medium uppercase tracking-wide text-ink-300 ${
                    index === 0 ? '' : 'pt-1.5'
                  }`}
                >
                  {label}
                </p>
              )}
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((day) => {
                  const key = toDateKey(day);
                  const inRange = key >= rangeStart && key <= rangeEnd;
                  const session = sessionsByDate.get(key);
                  const dayOff = off.has(key);
                  const scheduled =
                    course.schedule_days.includes(day.getDay() as ScheduleDay) &&
                    !dayOff;

                  let background: string;
                  let color: string;
                  let struck = false;
                  let ring: string | undefined;

                  if (!inRange) {
                    background = 'transparent';
                    color = 'transparent';
                  } else if (session?.status === 'present') {
                    background = course.color;
                    color = readableTextColor(course.color);
                  } else if (session?.status === 'absent') {
                    background = ABSENT_COLOR;
                    color = readableTextColor(ABSENT_COLOR);
                  } else if (session?.status === 'cancelled') {
                    background = '#E0DCD2';
                    color = '#6B6960';
                    struck = true;
                  } else if (session?.status === 'planned' || scheduled) {
                    background = hexToRgba(course.color, 0.12);
                    color = '#6B6960';
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

                  const interactive =
                    inRange && (session !== undefined || scheduled || dayOff);
                  const status = session
                    ? STATUS_LABEL[session.status]
                    : dayOff
                      ? 'No class'
                      : scheduled
                        ? 'Not marked'
                        : null;
                  const description = inRange
                    ? `${formatSessionDate(key)}${status ? `: ${status}` : ''}`
                    : formatSessionDate(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSelectDate(key, session)}
                      title={description}
                      aria-label={description}
                      style={{ backgroundColor: background, color, boxShadow: ring }}
                      className={`flex aspect-square items-center justify-center rounded-[4px] font-sans text-[11px] leading-none tabular-nums ${
                        struck ? 'line-through' : ''
                      } ${interactive ? '' : 'cursor-default'}`}
                    >
                      {inRange ? day.getDate() : ''}
                    </button>
                  );
                })}
              </div>
            </Fragment>
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
