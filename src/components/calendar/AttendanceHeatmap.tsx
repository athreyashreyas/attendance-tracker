import { useMemo } from 'react';
import { eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { toDateKey, fromDateKey, DAY_LABELS_SHORT } from '../../utils/dates';
import { hexToRgba } from '../../lib/colors';
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

  const days = useMemo(() => {
    const start = startOfWeek(fromDateKey(semesterStart), { weekStartsOn: 0 });
    const end = endOfWeek(fromDateKey(semesterEnd), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [semesterStart, semesterEnd]);

  const rangeStart = semesterStart;
  const rangeEnd = semesterEnd;

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

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = toDateKey(day);
          const inRange = key >= rangeStart && key <= rangeEnd;
          const session = sessionsByDate.get(key);
          const scheduled = course.schedule_days.includes(
            day.getDay() as ScheduleDay
          );

          let cell: { style: React.CSSProperties; content: string; faded: boolean };
          if (!inRange) {
            cell = { style: { backgroundColor: 'transparent' }, content: '', faded: true };
          } else if (session?.status === 'present') {
            cell = {
              style: { backgroundColor: course.color },
              content: '',
              faded: false,
            };
          } else if (session?.status === 'absent') {
            cell = {
              style: {
                backgroundColor: 'transparent',
                boxShadow: `inset 0 0 0 1.5px ${course.color}`,
              },
              content: '',
              faded: false,
            };
          } else if (session?.status === 'cancelled') {
            cell = {
              style: { backgroundColor: '#E0DCD2' },
              content: '×',
              faded: false,
            };
          } else if (session?.status === 'planned') {
            cell = {
              style: { backgroundColor: hexToRgba(course.color, 0.12) },
              content: '',
              faded: false,
            };
          } else if (scheduled) {
            cell = {
              style: { backgroundColor: hexToRgba(course.color, 0.12) },
              content: '',
              faded: false,
            };
          } else {
            cell = {
              style: { backgroundColor: '#F0EDE6' },
              content: '',
              faded: true,
            };
          }

          const interactive = inRange && (session !== undefined || scheduled);

          return (
            <button
              key={key}
              type="button"
              disabled={!interactive}
              onClick={() => onSelectDate(key, session)}
              title={key}
              style={cell.style}
              className={`flex aspect-square items-center justify-center rounded-[4px] text-[9px] leading-none text-ink-500 ${
                interactive ? '' : 'cursor-default'
              } ${cell.faded ? 'opacity-60' : ''}`}
            >
              {cell.content}
            </button>
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
            style={{ boxShadow: `inset 0 0 0 1.5px ${course.color}` }}
          />
          Absent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-parchment-300 text-[9px]">
            ×
          </span>
          Cancelled
        </span>
      </div>
    </div>
  );
}
