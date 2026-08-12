import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, startOfMonth } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarX2,
  CalendarRange,
  Plus,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { MonthCalendar, type DayDot } from '../components/calendar/MonthCalendar';
import { ViewFilterBar } from '../components/courses/ViewFilterBar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { DateInput } from '../components/ui/DateInput';
import { SessionForm } from '../components/sessions/SessionForm';
import { useCourseView } from '../hooks/useCourseView';
import { useAllSessions, useSessionMutations } from '../hooks/useSessions';
import { classesOnDay } from '../lib/calculations';
import { slotLabel } from '../lib/slots';
import { STATUS_LABEL } from '../lib/status';
import {
  fromDateKey,
  toDateKey,
  formatMonthLabel,
  formatSessionDate,
  todayKey,
} from '../utils/dates';
import type { Course, Semester, Session, SessionStatus } from '../types';

/** Whether a break covers one day or a run of them. */
type BreakSpan = 'single' | 'range';

interface FormTarget {
  courseId: string;
  session: Session | null;
  date?: string;
  /** Which class of the day to record. Left out, a new one goes on the end. */
  slot?: number;
  defaultStatus?: SessionStatus;
}

/** One class of the open day: whose it is, and what (if anything) it holds. */
interface DayRow {
  course: Course;
  slot: number;
  session: Session | null;
  /** "2nd of 2" on a day that meets twice, null when there's nothing to name. */
  label: string | null;
}

/**
 * One class on the day sheet. A marked class reads solid with its status; one
 * still to come reads as an outline asking to be recorded.
 */
function DayRowButton({ row, onOpen }: { row: DayRow; onOpen: () => void }) {
  const marked = !!row.session && row.session.status !== 'planned';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-card p-3.5 text-left ${
        marked ? 'bg-parchment-100' : 'border border-dashed border-parchment-300'
      }`}
    >
      <span
        className={`h-8 w-1.5 shrink-0 rounded-full ${marked ? '' : 'opacity-50'}`}
        style={{ backgroundColor: row.course.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-medium text-ink-900">
          {row.course.name}
        </span>
        {row.label && (
          <span className="block font-sans text-xs text-ink-300">{row.label}</span>
        )}
      </span>
      <span
        className={`shrink-0 font-sans text-xs ${marked ? 'text-ink-500' : 'text-ink-300'}`}
      >
        {row.session && marked ? STATUS_LABEL[row.session.status] : 'Tap to mark'}
      </span>
    </button>
  );
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

  // Recorded sessions for the courses in view, keyed by the class and day they
  // belong to, which is the shape the day-by-day reads want.
  const sessionsByCourseDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of allSessions ?? []) {
      if (!courseById.has(s.course_id)) continue;
      const key = `${s.course_id}|${s.scheduled_date}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [allSessions, courseById]);

  const semesterById = useMemo(() => {
    const map = new Map<string, Semester>();
    for (const s of semesters) map.set(s.id, s);
    return map;
  }, [semesters]);

  /** The term a class belongs to, for the dates it should run between. */
  function termOf(course: Course): Semester | null {
    return course.semester_id ? (semesterById.get(course.semester_id) ?? null) : null;
  }

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

  /** Every class each course in view holds on a date, recorded or not. */
  function shapeOf(dateKey: string): DayRow[] {
    const rows: DayRow[] = [];
    for (const course of courses) {
      const classes = classesOnDay(
        course,
        dateKey,
        sessionsByCourseDate.get(`${course.id}|${dateKey}`) ?? [],
        termOf(course)
      );
      classes.forEach(({ slot, session }, i) => {
        rows.push({
          course,
          slot,
          session,
          label: slotLabel(i + 1, classes.length),
        });
      });
    }
    return rows;
  }

  const canPrev = monthBounds ? clampedMonth > monthBounds.min : true;
  const canNext = monthBounds ? clampedMonth < monthBounds.max : true;

  function getDots(dateKey: string): DayDot[] {
    const dots: DayDot[] = [];
    for (const { course, session } of shapeOf(dateKey)) {
      if (session?.status === 'cancelled') continue;
      // Marked classes read as filled, everything still to come as outlined.
      const recorded = !!session && session.status !== 'planned';
      dots.push({ color: course.color, recorded });
    }
    return dots;
  }

  function openForm(target: FormTarget) {
    setSelectedDay(null);
    setForm(target);
  }

  // The open day, in the order it runs: each class of each course, whether
  // it's been marked or is still waiting.
  const dayRows = useMemo(
    () => (selectedDay ? shapeOf(selectedDay) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDay, courses, sessionsByCourseDate, semesterById]
  );
  const dayMarked = dayRows.filter((r) => r.session && r.session.status !== 'planned');
  const dayToMark = dayRows.filter((r) => !r.session || r.session.status === 'planned');

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
          {dayRows.length === 0 && (
            <p className="py-4 text-center font-sans text-sm text-ink-500">
              Nothing scheduled on this day.
            </p>
          )}

          {/* Marked first, then everything still waiting to be recorded. */}
          {[...dayMarked, ...dayToMark].map((row) => (
            <DayRowButton
              key={`${row.course.id}|${row.slot}`}
              row={row}
              onOpen={() =>
                openForm({
                  courseId: row.course.id,
                  session: row.session,
                  date: selectedDay ?? undefined,
                  slot: row.slot,
                })
              }
            />
          ))}

          {courses.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 font-sans text-xs font-medium text-ink-500">
                Add an extra class
              </p>
              <p className="mb-2 font-sans text-xs text-ink-300">
                Adds another class on this day, unmarked and ready to record
                later. A class already on the day keeps its own mark.
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
          slot={form.slot}
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
  const [span, setSpan] = useState<BreakSpan>('single');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSpan('single');
    setStart(todayKey());
    setEnd(toDateKey(addDays(new Date(), 1)));
    setSelected(new Set(courses.map((c) => c.id))); // default: all classes
    setError(null);
    setResult(null);
  }, [open, courses]);

  const oneDay = span === 'single';

  function chooseSpan(next: BreakSpan) {
    setSpan(next);
    setError(null);
    setResult(null);
  }

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
    const last = oneDay ? start : end;
    if (last < start) {
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
      const count = await markBreak(chosen, start, last);
      setResult(
        count === 0
          ? oneDay
            ? 'No scheduled classes on that day.'
            : 'No scheduled classes in that range.'
          : `Cancelled ${count} class${count === 1 ? '' : 'es'}.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel a break">
      <div className="space-y-4 pb-2">
        <div className="flex gap-1.5 rounded-lg bg-parchment-200 p-1">
          <SpanTab
            active={oneDay}
            onClick={() => chooseSpan('single')}
            icon={<CalendarX2 size={14} />}
            label="A single day"
          />
          <SpanTab
            active={!oneDay}
            onClick={() => chooseSpan('range')}
            icon={<CalendarRange size={14} />}
            label="A stretch of days"
          />
        </div>

        {/* Wording and layout stay the same height in both modes, so switching
            tabs never resizes the sheet and shoves the title around. */}
        <p className="font-sans text-sm text-ink-500">
          Cancels the scheduled classes you choose on the dates you set. Anything
          you have already marked stays as it is.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className={oneDay ? 'col-span-2' : undefined}>
            <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
              {oneDay ? 'Day' : 'From'}
            </label>
            <DateInput value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          {!oneDay && (
            <div>
              <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
                To
              </label>
              <DateInput value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          )}
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

        {/* One line is always reserved here, so a message arriving doesn't
            shunt the sheet upward either. */}
        <p
          aria-live="polite"
          className={`min-h-5 font-sans text-sm ${
            error ? 'text-rose-600' : 'text-sage-600'
          }`}
        >
          {error ?? result}
        </p>
        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          {oneDay ? 'Cancel classes that day' : 'Cancel classes in range'}
        </Button>
      </div>
    </BottomSheet>
  );
}

function SpanTab({
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
