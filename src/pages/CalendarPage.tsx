import { useMemo, useState } from 'react';
import { addMonths, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { SessionForm } from '../components/sessions/SessionForm';
import { useActiveSemester } from '../hooks/useSemesters';
import { useCourses } from '../hooks/useCourses';
import { useAllSessions } from '../hooks/useSessions';
import {
  fromDateKey,
  formatMonthLabel,
  formatSessionDate,
} from '../utils/dates';
import type { Course, Session, SessionStatus } from '../types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  cancelled: 'Cancelled',
};

export function CalendarPage() {
  const semester = useActiveSemester();
  const { data: courses } = useCourses(semester?.id);
  const { data: allSessions } = useAllSessions();

  const [filter, setFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses ?? []) map.set(c.id, c);
    return map;
  }, [courses]);

  // Sessions belonging to this semester's courses, grouped by date.
  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of allSessions ?? []) {
      if (!courseById.has(s.course_id)) continue;
      if (filter && s.course_id !== filter) continue;
      const list = map.get(s.scheduled_date) ?? [];
      list.push(s);
      map.set(s.scheduled_date, list);
    }
    return map;
  }, [allSessions, courseById, filter]);

  const monthBounds = useMemo(() => {
    if (!semester) return null;
    return {
      min: startOfMonth(fromDateKey(semester.start_date)),
      max: startOfMonth(fromDateKey(semester.end_date)),
    };
  }, [semester]);

  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  const clampedMonth = useMemo(() => {
    if (!monthBounds) return month;
    if (month < monthBounds.min) return monthBounds.min;
    if (month > monthBounds.max) return monthBounds.max;
    return month;
  }, [month, monthBounds]);

  const canPrev = monthBounds ? clampedMonth > monthBounds.min : false;
  const canNext = monthBounds ? clampedMonth < monthBounds.max : false;

  function getDots(dateKey: string): string[] {
    const list = byDate.get(dateKey) ?? [];
    return list
      .map((s) => courseById.get(s.course_id)?.color)
      .filter((c): c is string => !!c);
  }

  const daySessions = selectedDay ? (byDate.get(selectedDay) ?? []) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Calendar" right={<SyncIndicator />} />

      {/* Course filter */}
      {(courses?.length ?? 0) > 0 && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <FilterChip
            label="All"
            active={filter === null}
            onClick={() => setFilter(null)}
          />
          {courses!.map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              color={c.color}
              active={filter === c.id}
              onClick={() => setFilter(c.id)}
            />
          ))}
        </div>
      )}

      {/* Month nav */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setMonth(addMonths(clampedMonth, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-sans text-base font-medium text-ink-900">
          {formatMonthLabel(clampedMonth)}
        </h2>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setMonth(addMonths(clampedMonth, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="rounded-card bg-parchment-50 p-3 shadow-sm">
        <MonthCalendar
          month={clampedMonth}
          getDots={getDots}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* Day detail sheet */}
      <BottomSheet
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatSessionDate(selectedDay) : ''}
      >
        <div className="space-y-2 pb-2">
          {daySessions.length === 0 ? (
            <p className="py-6 text-center font-sans text-sm text-ink-500">
              No classes recorded on this day.
            </p>
          ) : (
            daySessions.map((s) => {
              const course = courseById.get(s.course_id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedDay(null);
                    setEditSession(s);
                  }}
                  className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3.5 text-left"
                >
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: course?.color ?? '#9B9890' }}
                  />
                  <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-900">
                    {course?.name ?? 'Course'}
                  </span>
                  <span className="shrink-0 font-sans text-xs text-ink-500">
                    {STATUS_LABEL[s.status]}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </BottomSheet>

      {editSession && (
        <SessionForm
          open={editSession !== null}
          onClose={() => setEditSession(null)}
          courseId={editSession.course_id}
          session={editSession}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-sans text-sm font-medium transition-colors ${
        active ? 'bg-sage-500 text-white' : 'bg-parchment-200 text-ink-500'
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: active ? '#FFFFFF' : color }}
        />
      )}
      {label}
    </button>
  );
}
