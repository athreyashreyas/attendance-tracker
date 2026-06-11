import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarX2, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { MonthCalendar, type DayDot } from '../components/calendar/MonthCalendar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { SessionForm } from '../components/sessions/SessionForm';
import { useActiveSemester } from '../hooks/useSemesters';
import { useCourses } from '../hooks/useCourses';
import { useAllSessions, useSessionMutations } from '../hooks/useSessions';
import { generateExpectedDates } from '../lib/calculations';
import {
  fromDateKey,
  toDateKey,
  formatMonthLabel,
  formatSessionDate,
  todayKey,
} from '../utils/dates';
import type { Course, Session, SessionStatus } from '../types';

const STATUS_LABEL: Record<SessionStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  cancelled: 'Cancelled',
};

interface FormTarget {
  courseId: string;
  session: Session | null;
  date?: string;
}

export function CalendarPage() {
  const semester = useActiveSemester();
  const { data: courses } = useCourses(semester?.id);
  const { data: allSessions } = useAllSessions();

  const [filter, setFilter] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses ?? []) map.set(c.id, c);
    return map;
  }, [courses]);

  // Recorded sessions in this semester, grouped by date (respecting the filter).
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

  // Every course+date that already has a recorded session (unfiltered).
  const recordedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessions ?? []) {
      if (courseById.has(s.course_id)) set.add(`${s.course_id}|${s.scheduled_date}`);
    }
    return set;
  }, [allSessions, courseById]);

  // Planned (scheduled but unrecorded) classes by date.
  const plannedByDate = useMemo(() => {
    const map = new Map<string, Course[]>();
    if (!semester) return map;
    const start = fromDateKey(semester.start_date);
    const end = fromDateKey(semester.end_date);
    for (const c of courses ?? []) {
      if (filter && c.id !== filter) continue;
      for (const d of generateExpectedDates(c, start, end)) {
        const key = toDateKey(d);
        if (recordedKeys.has(`${c.id}|${key}`)) continue;
        const list = map.get(key) ?? [];
        list.push(c);
        map.set(key, list);
      }
    }
    return map;
  }, [courses, semester, filter, recordedKeys]);

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

  function getDots(dateKey: string): DayDot[] {
    const dots: DayDot[] = [];
    for (const s of byDate.get(dateKey) ?? []) {
      const color = courseById.get(s.course_id)?.color;
      if (color && s.status !== 'cancelled') dots.push({ color, recorded: true });
    }
    for (const c of plannedByDate.get(dateKey) ?? []) {
      dots.push({ color: c.color, recorded: false });
    }
    return dots;
  }

  function openForm(target: FormTarget) {
    setSelectedDay(null);
    setForm(target);
  }

  const dayRecorded = selectedDay ? (byDate.get(selectedDay) ?? []) : [];
  const dayPlanned = selectedDay ? (plannedByDate.get(selectedDay) ?? []) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Calendar"
        right={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBreakOpen(true)}
              aria-label="Add a break or holiday"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
            >
              <CalendarX2 size={18} />
            </button>
            <SyncIndicator />
          </div>
        }
      />

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
        <div className="mt-3 flex items-center gap-4 px-1 font-sans text-[10px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-300" />
            Marked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full ring-1 ring-inset ring-ink-300" />
            Scheduled
          </span>
        </div>
      </div>

      {/* Day detail */}
      <BottomSheet
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatSessionDate(selectedDay) : ''}
      >
        <div className="space-y-2 pb-2">
          {dayRecorded.length === 0 && dayPlanned.length === 0 && (
            <p className="py-4 text-center font-sans text-sm text-ink-500">
              Nothing scheduled on this day.
            </p>
          )}

          {dayRecorded.map((s) => {
            const course = courseById.get(s.course_id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openForm({ courseId: s.course_id, session: s })}
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
          })}

          {dayPlanned.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                openForm({
                  courseId: c.id,
                  session: null,
                  date: selectedDay ?? undefined,
                })
              }
              className="flex w-full items-center gap-3 rounded-card border border-dashed border-parchment-300 p-3.5 text-left"
            >
              <span
                className="h-8 w-1.5 shrink-0 rounded-full opacity-50"
                style={{ backgroundColor: c.color }}
              />
              <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-900">
                {c.name}
              </span>
              <span className="shrink-0 font-sans text-xs text-ink-300">
                Tap to mark
              </span>
            </button>
          ))}

          {(courses?.length ?? 0) > 0 && (
            <div className="pt-2">
              <p className="mb-2 font-sans text-xs font-medium text-ink-500">
                Add an extra class
              </p>
              <div className="flex flex-wrap gap-2">
                {courses!.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      openForm({
                        courseId: c.id,
                        session: null,
                        date: selectedDay ?? undefined,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-full bg-parchment-200 px-3 py-1.5 font-sans text-xs font-medium text-ink-700"
                  >
                    <Plus size={12} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {form && (
        <SessionForm
          open
          onClose={() => setForm(null)}
          courseId={form.courseId}
          session={form.session}
          defaultDate={form.date}
        />
      )}

      <BreakSheet
        open={breakOpen}
        onClose={() => setBreakOpen(false)}
        courses={courses ?? []}
        semesterStart={semester?.start_date}
        semesterEnd={semester?.end_date}
      />
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

function BreakSheet({
  open,
  onClose,
  courses,
  semesterStart,
  semesterEnd,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  semesterStart?: string;
  semesterEnd?: string;
}) {
  const { markBreak } = useSessionMutations();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStart(semesterStart && todayKey() < semesterStart ? semesterStart : todayKey());
    setEnd(toDateKey(addDays(new Date(), 1)));
    setError(null);
    setResult(null);
  }, [open, semesterStart]);

  async function handleSave() {
    if (end < start) {
      setError('The end date should be on or after the start date.');
      return;
    }
    if (semesterStart && start < semesterStart) {
      setError('That start date is before the semester begins.');
      return;
    }
    if (semesterEnd && end > semesterEnd) {
      setError('That end date is after the semester ends.');
      return;
    }
    setSaving(true);
    try {
      const count = await markBreak(courses, start, end);
      setResult(
        count === 0
          ? 'No scheduled classes in that range.'
          : `Cancelled ${count} class${count === 1 ? '' : 'es'}.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel a break">
      <div className="space-y-4 pb-2">
        <p className="font-sans text-sm text-ink-500">
          Cancels every scheduled class between these dates, across all courses.
          Classes you have already marked stay as they are.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              From
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              To
            </label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
            />
          </div>
        </div>
        {error && <p className="font-sans text-sm text-rose-600">{error}</p>}
        {result && <p className="font-sans text-sm text-sage-600">{result}</p>}
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          Cancel classes in range
        </Button>
      </div>
    </BottomSheet>
  );
}
