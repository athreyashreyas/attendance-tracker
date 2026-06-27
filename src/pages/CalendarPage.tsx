import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarX2, Plus, Check } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { MonthCalendar, type DayDot } from '../components/calendar/MonthCalendar';
import { ViewFilterBar } from '../components/courses/ViewFilterBar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { DateInput } from '../components/ui/DateInput';
import { SessionForm } from '../components/sessions/SessionForm';
import { useCourseView } from '../hooks/useCourseView';
import { useAllSessions, useSessionMutations } from '../hooks/useSessions';
import { expectedDatesInRange } from '../lib/calculations';
import { STATUS_LABEL } from '../lib/status';
import {
  fromDateKey,
  toDateKey,
  formatMonthLabel,
  formatSessionDate,
  todayKey,
} from '../utils/dates';
import type { Course, Session, SessionStatus } from '../types';

interface FormTarget {
  courseId: string;
  session: Session | null;
  date?: string;
  defaultStatus?: SessionStatus;
}

export function CalendarPage() {
  const { filter, setFilter, courses, allCourses, semesters } = useCourseView();
  const { data: allSessions } = useAllSessions();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));

  const hasStandalone = allCourses.some((c) => !c.semester_id);

  const courseById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) map.set(c.id, c);
    return map;
  }, [courses]);

  // Recorded sessions for the courses in view, grouped by date.
  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of allSessions ?? []) {
      if (!courseById.has(s.course_id)) continue;
      const list = map.get(s.scheduled_date) ?? [];
      list.push(s);
      map.set(s.scheduled_date, list);
    }
    return map;
  }, [allSessions, courseById]);

  const recordedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessions ?? []) {
      if (courseById.has(s.course_id)) set.add(`${s.course_id}|${s.scheduled_date}`);
    }
    return set;
  }, [allSessions, courseById]);

  // Bound navigation to a single semester's span; free otherwise.
  const monthBounds = useMemo(() => {
    if (filter === 'all' || filter === 'other') return null;
    const sem = semesters.find((s) => s.id === filter);
    if (!sem) return null;
    return {
      min: startOfMonth(fromDateKey(sem.start_date)),
      max: startOfMonth(fromDateKey(sem.end_date)),
    };
  }, [filter, semesters]);

  const clampedMonth = useMemo(() => {
    if (!monthBounds) return month;
    if (month < monthBounds.min) return monthBounds.min;
    if (month > monthBounds.max) return monthBounds.max;
    return month;
  }, [month, monthBounds]);

  // Planned (scheduled-but-unrecorded) classes, computed only for the visible
  // grid so standalone classes with no end date stay bounded.
  const plannedByDate = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(clampedMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(clampedMonth), { weekStartsOn: 0 });
    const map = new Map<string, Course[]>();
    for (const c of courses) {
      for (const d of expectedDatesInRange(c, gridStart, gridEnd)) {
        const key = toDateKey(d);
        if (recordedKeys.has(`${c.id}|${key}`)) continue;
        const list = map.get(key) ?? [];
        list.push(c);
        map.set(key, list);
      }
    }
    return map;
  }, [courses, clampedMonth, recordedKeys]);

  const canPrev = monthBounds ? clampedMonth > monthBounds.min : true;
  const canNext = monthBounds ? clampedMonth < monthBounds.max : true;

  function getDots(dateKey: string): DayDot[] {
    const dots: DayDot[] = [];
    for (const s of byDate.get(dateKey) ?? []) {
      const color = courseById.get(s.course_id)?.color;
      if (!color || s.status === 'cancelled') continue;
      // Planned sessions read as outlined (upcoming), decided ones as filled.
      dots.push({ color, recorded: s.status !== 'planned' });
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

  const daySessions = selectedDay ? (byDate.get(selectedDay) ?? []) : [];
  const dayDecided = daySessions.filter((s) => s.status !== 'planned');
  const dayPlannedSessions = daySessions.filter((s) => s.status === 'planned');
  const dayPlannedRecurring = selectedDay
    ? (plannedByDate.get(selectedDay) ?? [])
    : [];
  const dayHasNothing =
    dayDecided.length === 0 &&
    dayPlannedSessions.length === 0 &&
    dayPlannedRecurring.length === 0;

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

      <ViewFilterBar
        filter={filter}
        onChange={setFilter}
        semesters={semesters}
        hasStandalone={hasStandalone}
      />

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
          {dayHasNothing && (
            <p className="py-4 text-center font-sans text-sm text-ink-500">
              Nothing scheduled on this day.
            </p>
          )}

          {dayDecided.map((s) => {
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
                  {course?.name ?? 'Class'}
                </span>
                <span className="shrink-0 font-sans text-xs text-ink-500">
                  {STATUS_LABEL[s.status]}
                </span>
              </button>
            );
          })}

          {/* Planned: ad-hoc planned sessions (tap to mark/edit) and recurring
              scheduled classes (tap to record). */}
          {dayPlannedSessions.map((s) => {
            const course = courseById.get(s.course_id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => openForm({ courseId: s.course_id, session: s })}
                className="flex w-full items-center gap-3 rounded-card border border-dashed border-parchment-300 p-3.5 text-left"
              >
                <span
                  className="h-8 w-1.5 shrink-0 rounded-full opacity-50"
                  style={{ backgroundColor: course?.color ?? '#9B9890' }}
                />
                <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-900">
                  {course?.name ?? 'Class'}
                </span>
                <span className="shrink-0 font-sans text-xs text-ink-300">
                  Tap to mark
                </span>
              </button>
            );
          })}

          {dayPlannedRecurring.map((c) => (
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

          {courses.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 font-sans text-xs font-medium text-ink-500">
                Add an extra class
              </p>
              <p className="mb-2 font-sans text-xs text-ink-300">
                Adds it to this day unmarked, ready to record later.
              </p>
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      openForm({
                        courseId: c.id,
                        session: null,
                        date: selectedDay ?? undefined,
                        defaultStatus: 'planned',
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
          defaultStatus={form.defaultStatus}
        />
      )}

      <BreakSheet
        open={breakOpen}
        onClose={() => setBreakOpen(false)}
        courses={courses}
      />
    </div>
  );
}

function BreakSheet({
  open,
  onClose,
  courses,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
}) {
  const { markBreak } = useSessionMutations();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStart(todayKey());
    setEnd(toDateKey(addDays(new Date(), 1)));
    setSelected(new Set(courses.map((c) => c.id))); // default: all classes
    setError(null);
    setResult(null);
  }, [open, courses]);

  const allSelected = selected.size === courses.length && courses.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(courses.map((c) => c.id)));
  }

  async function handleSave() {
    if (end < start) {
      setError('The end date should be on or after the start date.');
      return;
    }
    if (selected.size === 0) {
      setError('Pick at least one class to cancel.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const chosen = courses.filter((c) => selected.has(c.id));
      const count = await markBreak(chosen, start, end);
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
          Cancels the scheduled classes you choose between these dates. Anything you
          have already marked stays as it is.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              From
            </label>
            <DateInput value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              To
            </label>
            <DateInput value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        {courses.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-sans text-xs font-medium text-ink-500">Classes</p>
              <button
                type="button"
                onClick={toggleAll}
                className="font-sans text-xs font-medium text-sage-600"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {courses.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-3 rounded-card bg-parchment-100 p-3 text-left"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: on ? c.color : 'transparent',
                        boxShadow: on ? undefined : `inset 0 0 0 1.5px #D4D2CB`,
                      }}
                    >
                      {on && <Check size={14} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-900">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="font-sans text-sm text-rose-600">{error}</p>}
        {result && <p className="font-sans text-sm text-sage-600">{result}</p>}
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          Cancel classes in range
        </Button>
      </div>
    </BottomSheet>
  );
}
