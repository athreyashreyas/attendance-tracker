import { useMemo } from 'react';
import { termWindow } from '../../lib/calculations';
import {
  formatDays,
  formatSpan,
  indexOfPeriodOn,
  schedulePeriods,
  scheduleSpans,
} from '../../lib/schedule';
import { hexToRgba } from '../../lib/colors';
import { todayKey } from '../../utils/dates';
import type { Course, Semester } from '../../types';

interface ScheduleTimelineProps {
  course: Course;
  semester: Semester | null;
}

/**
 * The class's timetable over time, read back as a record: the days it ran on
 * before it moved, and the days it runs on now, each against the stretch of
 * term it covers.
 *
 * It only appears for a class whose days have actually changed. For every
 * other class the timetable is one line, and it is already in the edit sheet
 * where it is set, so a card here would be a card saying nothing.
 */
export function ScheduleTimeline({ course, semester }: ScheduleTimelineProps) {
  const { start, end } = termWindow(course, semester);
  const periods = useMemo(() => schedulePeriods(course), [course]);
  const spans = useMemo(
    () => scheduleSpans(periods, start, end),
    [periods, start, end]
  );
  const now = indexOfPeriodOn(periods, todayKey());

  if (spans.length < 2) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 font-sans text-base font-medium text-ink-900">
        Timetable
      </h2>
      <div className="rounded-card bg-parchment-50 p-4 shadow-sm">
        <ul className="space-y-3">
          {spans.map((span, i) => {
            const isNow = span.index === now;
            const last = i === spans.length - 1;
            return (
              <li key={`${span.period.effective_from ?? 'start'}-${span.index}`}>
                <div className="flex gap-3">
                  {/* The rail: a dot per stretch, joined into one run of time */}
                  <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: isNow
                          ? course.color
                          : hexToRgba(course.color, 0.3),
                      }}
                    />
                    {!last && (
                      <span
                        className="mt-1 w-px flex-1 self-center"
                        style={{ backgroundColor: hexToRgba(course.color, 0.25) }}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="flex items-baseline gap-2">
                      <p className="min-w-0 flex-1 font-sans text-sm text-ink-900">
                        {formatDays(span.period)}
                      </p>
                      {isNow && (
                        <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 font-sans text-[10px] font-medium text-sage-600">
                          Now
                        </span>
                      )}
                    </div>
                    <p className="font-sans text-[11px] text-ink-500">
                      {formatSpan(span)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 font-sans text-[11px] text-ink-300">
          Classes marked under an earlier timetable stay exactly as you left
          them.
        </p>
      </div>
    </div>
  );
}
