import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import {
  Archive,
  CalendarClock,
  Check,
  ChevronDown,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { CourseColorPicker } from './CourseColorPicker';
import { DaysOffPicker } from './DaysOffPicker';
import { useCourseMutations } from '../../hooks/useCourses';
import { db } from '../../lib/db';
import { DEFAULT_COURSE_COLOR } from '../../lib/colors';
import {
  MAX_TERM_DAYS,
  countClassesInTimetable,
} from '../../lib/calculations';
import {
  MAX_SCHEDULE_CHANGES,
  applyScheduleChange,
  editPeriod,
  formatDays,
  formatSpan,
  indexOfPeriodOn,
  isDateKey,
  makePeriod,
  mirrorOf,
  moveScheduleChange,
  nextDay,
  periodsEqual,
  removeScheduleChange,
  schedulePeriods,
  scheduleSpans,
  spanIsEmpty,
  timetableHoldsClass,
} from '../../lib/schedule';
import { MAX_CLASSES_PER_DAY, normalizeCount, slotOf } from '../../lib/slots';
import {
  WEEK_ORDER,
  DAY_LABELS,
  formatLongDate,
  fromDateKey,
  todayKey,
} from '../../utils/dates';
import type {
  ClassesPerDay,
  Course,
  ScheduleDay,
  SchedulePeriod,
  Semester,
} from '../../types';

const DAY_SHORT: Record<number, string> = {
  0: 'Su',
  1: 'Mo',
  2: 'Tu',
  3: 'We',
  4: 'Th',
  5: 'Fr',
  6: 'Sa',
};

const NO_SEMESTER = '';

/**
 * The same timeline with every day meeting once. Days off are counted in days
 * rather than in classes: a day off on a day that meets twice is still one day
 * off, though it takes both classes with it.
 */
function singles(periods: SchedulePeriod[]): SchedulePeriod[] {
  return periods.map((p) => makePeriod(p.days, {}, p.effective_from));
}

/** One weekday, with how many times the class meets on it. */
function DayCountRow({
  label,
  count,
  onChange,
}: {
  label: string;
  count: number;
  onChange: (count: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-parchment-50 px-3 py-2">
      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-900">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(count - 1)}
          disabled={count <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-parchment-200 text-ink-700 disabled:opacity-30"
          aria-label={`One fewer class on ${label}`}
        >
          <Minus size={14} />
        </motion.button>
        <span className="w-8 text-center font-sans text-sm tabular-nums text-ink-900">
          {count}
        </span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(count + 1)}
          disabled={count >= MAX_CLASSES_PER_DAY}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-parchment-200 text-ink-700 disabled:opacity-30"
          aria-label={`One more class on ${label}`}
        >
          <Plus size={14} />
        </motion.button>
      </div>
    </div>
  );
}

interface CourseFormProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
  semesters: Semester[];
  /** Which semester a brand-new class should default to (null = standalone). */
  defaultSemesterId?: string | null;
  /** Called after the class is deleted (e.g. to navigate away from its page). */
  onDeleted?: () => void;
}

export function CourseForm({
  open,
  onClose,
  course,
  semesters,
  defaultSemesterId,
  onDeleted,
}: CourseFormProps) {
  const { saveCourse, setCourseArchived, deleteCourse } = useCourseMutations();
  const isEdit = !!course;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COURSE_COLOR);
  /**
   * The class's timetable over time: one entry for a class that has always met
   * on the same days, one more for each time they moved. The day toggles edit
   * whichever entry is selected, so the days of a stretch that has already
   * been and gone can still be put right.
   */
  const [periods, setPeriods] = useState<SchedulePeriod[]>([makePeriod([])]);
  const [editing, setEditing] = useState(0);
  /** The timeline as it was when the sheet opened, to compare a change against. */
  const [savedPeriods, setSavedPeriods] = useState<SchedulePeriod[]>([]);
  /** The date field of the selected change, while it is being typed. */
  const [changeDraft, setChangeDraft] = useState('');
  /** The date a timetable change is being asked about, at save time. */
  const [changeFrom, setChangeFrom] = useState('');
  /** True while the save is waiting to be told whether the timetable moved. */
  const [asking, setAsking] = useState(false);
  /** Set once that question has been answered, until the days move again. */
  const [decided, setDecided] = useState(false);
  /** How many classes this one has on record, so we know what is at stake. */
  const [recorded, setRecorded] = useState(0);
  const [perDayOpen, setPerDayOpen] = useState(false);
  const [minPct, setMinPct] = useState(75);
  const [semesterId, setSemesterId] = useState<string>(NO_SEMESTER);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [excluded, setExcluded] = useState<string[]>([]);
  const [daysOffOpen, setDaysOffOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [markedCount, setMarkedCount] = useState<number | null>(null);
  const [losses, setLosses] = useState<{
    lostDaysOff: number;
    strandedMarks: number;
    strandedBySchedule: number;
  } | null>(null);

  // Reset fields whenever the sheet opens for a (different) course.
  useEffect(() => {
    if (!open) return;
    setName(course?.name ?? '');
    setColor(course?.color ?? DEFAULT_COURSE_COLOR);
    const timeline = course ? schedulePeriods(course) : [makePeriod([])];
    setPeriods(timeline);
    setSavedPeriods(timeline);
    // The timetable the class is running now is the one to edit by default: a
    // stretch that has already passed is reached by tapping it.
    setEditing(indexOfPeriodOn(timeline, todayKey()));
    setChangeDraft('');
    setChangeFrom('');
    setAsking(false);
    setDecided(false);
    setRecorded(0);
    // Opened for a class that has a double day anywhere on its timeline, so
    // it's visible at once.
    setPerDayOpen(
      timeline.some((p) => Object.values(p.sessions_per_day).some((n) => n > 1))
    );
    setMinPct(course?.min_attendance_pct ?? 75);
    setSemesterId(course?.semester_id ?? defaultSemesterId ?? NO_SEMESTER);
    setStart(course?.start_date ?? '');
    setEnd(course?.end_date ?? '');
    setExcluded(course?.excluded_dates ?? []);
    setDaysOffOpen(false);
    setError(null);
    setConfirmDelete(false);
    setMarkedCount(null);
    setLosses(null);
  }, [open, course, defaultSemesterId]);

  // Whether this class has a record worth protecting decides whether editing
  // its days asks when the change started. Counted once, on opening.
  useEffect(() => {
    if (!open || !course) return;
    let cancelled = false;
    void db.sessions
      .where('course_id')
      .equals(course.id)
      .filter((s) => !s.deleted_at)
      .count()
      .then((n) => {
        if (!cancelled) setRecorded(n);
      });
    return () => {
      cancelled = true;
    };
  }, [open, course]);

  // When the user asks to delete, count how much attendance they'd lose so we
  // can warn before removing the whole class.
  async function askDelete() {
    setConfirmDelete(true);
    if (!course) return;
    const n = await db.sessions
      .where('course_id')
      .equals(course.id)
      .filter((s) => !s.deleted_at && s.status !== 'cancelled')
      .count();
    setMarkedCount(n);
  }

  const selectedSemester = useMemo<Semester | null>(
    () => semesters.find((s) => s.id === semesterId) ?? null,
    [semesters, semesterId]
  );

  // Archived terms aren't offered for new classes, but one already sitting in
  // an archived term must still be able to show (and keep) it.
  const offerableSemesters = useMemo(
    () => semesters.filter((s) => !s.archived_at || s.id === semesterId),
    [semesters, semesterId]
  );

  // Archived because its term is, rather than on its own account.
  const archivedBySemester = !!course && !!selectedSemester?.archived_at;

  // Days off are picked against whatever window the class will actually run in:
  // its own dates when set, otherwise the semester it belongs to.
  const windowStart = start || selectedSemester?.start_date || '';
  const windowEnd = end || selectedSemester?.end_date || '';

  // The stretch of term the day toggles are editing, and the days it holds.
  const current = periods[editing] ?? periods[0] ?? makePeriod([]);
  const days = current.days;
  const perDay = current.sessions_per_day;

  // The timeline as stretches of dates: one row for a class that has never
  // moved its days, one per stretch for a class that has.
  const spans = useMemo(
    () => scheduleSpans(periods, windowStart || null, windowEnd || null),
    [periods, windowStart, windowEnd]
  );

  const classCount = useMemo(
    () => countClassesInTimetable(periods, windowStart, windowEnd, excluded),
    [periods, windowStart, windowEnd, excluded]
  );
  // Only days off that land on a real class day inside the window count. This
  // one counts days rather than classes: a day off on a day that meets twice is
  // still one day off, though it takes both classes with it.
  const offCount = useMemo(
    () =>
      countClassesInTimetable(singles(periods), windowStart, windowEnd, []) -
      countClassesInTimetable(singles(periods), windowStart, windowEnd, excluded),
    [periods, windowStart, windowEnd, excluded]
  );

  // Days that meet more than once, in the order they're shown.
  const doubleDays = useMemo(
    () => WEEK_ORDER.filter((d) => days.includes(d) && (perDay[d] ?? 1) > 1),
    [days, perDay]
  );

  /**
   * The earliest a change may start: the day after the stretch it splits
   * begins. A change on that stretch's own first day leaves it covering
   * nothing, and is a correction rather than a change.
   */
  const changeMin = current.effective_from
    ? nextDay(current.effective_from)
    : windowStart
      ? nextDay(windowStart)
      : undefined;

  /**
   * Whether editing the days should ask when the change started. A class with
   * nothing recorded and no term behind it has no past to keep, so it is edited
   * in place and the question never comes up.
   */
  const hasPastToKeep =
    isEdit && (recorded > 0 || (!!windowStart && windowStart <= todayKey()));

  // The stranded-marks panel is counted against the schedule as it stood when
  // it was opened. Any control that moves the schedule has to retire it, or
  // "Save anyway" skips the recount and the newly stranded marks go unreported
  // by the one dialog whose whole job is reporting them.
  function setCurrentPeriod(nextDays: ScheduleDay[], nextPerDay: ClassesPerDay) {
    setLosses(null);
    setAsking(false);
    // Moving the days again is a new question, whatever the last answer was.
    setDecided(false);
    setPeriods((prev) => editPeriod(prev, editing, nextDays, nextPerDay));
  }

  function toggleDay(day: ScheduleDay) {
    setCurrentPeriod(
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
      perDay
    );
  }

  function setDayCount(day: ScheduleDay, count: number) {
    const next = { ...perDay };
    const value = normalizeCount(count);
    if (value > 1) next[day] = value;
    else delete next[day];
    setCurrentPeriod(days, next);
  }

  /** Edit a different stretch of the term, of the timeline it belongs to. */
  function selectSpanIn(list: SchedulePeriod[], index: number) {
    setEditing(index);
    setChangeDraft(list[index]?.effective_from ?? '');
    setLosses(null);
    setAsking(false);
    setError(null);
  }

  function selectSpan(index: number) {
    selectSpanIn(periods, index);
  }

  /** Move the selected change to another date. */
  function moveChange(next: string) {
    setChangeDraft(next);
    if (!isDateKey(next)) return;
    const moved = moveScheduleChange(periods, editing, next);
    setPeriods(moved);
    setEditing(Math.max(moved.findIndex((p) => p.effective_from === next), 0));
    setLosses(null);
  }

  /** Undo a change: its dates go back to the timetable that ran before it. */
  function dropChange() {
    const next = removeScheduleChange(periods, editing);
    setPeriods(next);
    selectSpanIn(next, Math.min(editing, next.length - 1));
  }

  function changeDaysOff(next: string[]) {
    setLosses(null);
    setExcluded(next);
  }

  /**
   * What a narrower class would cost. Days off outside the new dates are
   * dropped for good; classes already marked outside them stop appearing on the
   * overview grid; and classes marked on a day the schedule no longer holds —
   * a weekday dropped, a double day back to one, a new day off — stay in your
   * records and your percentage while no longer being expected. All three are
   * worth saying out loud before saving.
   */
  async function countLosses(nextPeriods: SchedulePeriod[]) {
    if (!course) return null;
    const windowChanged =
      (start || null) !== (course.start_date ?? null) ||
      (end || null) !== (course.end_date ?? null) ||
      (semesterId || null) !== (course.semester_id ?? null);
    const narrowed = windowChanged && !!windowStart && !!windowEnd;

    const lostDaysOff = narrowed
      ? excluded.filter((d) => d < windowStart || d > windowEnd).length
      : 0;

    const marked = await db.sessions
      .where('course_id')
      .equals(course.id)
      .filter((s) => !s.deleted_at && s.status !== 'planned')
      .toArray();

    const outside = (dateKey: string) =>
      narrowed && (dateKey < windowStart || dateKey > windowEnd);
    const strandedMarks = marked.filter((s) => outside(s.scheduled_date)).length;

    // Only classes the old timeline genuinely held: an extra class added by
    // hand to a day the class never meets was never on the schedule, so
    // changing the schedule doesn't strand it. Both sides are asked of the
    // date the class sits on, so recording a change rather than a correction
    // strands nothing before the date it started.
    const oldExcluded = course.excluded_dates ?? [];
    const strandedBySchedule = marked.filter((s) => {
      if (outside(s.scheduled_date)) return false; // already counted above
      const slot = slotOf(s);
      return (
        timetableHoldsClass(savedPeriods, oldExcluded, s.scheduled_date, slot) &&
        !timetableHoldsClass(nextPeriods, excluded, s.scheduled_date, slot)
      );
    }).length;

    if (lostDaysOff === 0 && strandedMarks === 0 && strandedBySchedule === 0) {
      return null;
    }
    return { lostDaysOff, strandedMarks, strandedBySchedule };
  }

  /**
   * The timetable the selected stretch had when the sheet opened, or null when
   * this stretch is new. What "has it changed?" is measured against.
   */
  const savedCurrent = savedPeriods[editing] ?? null;

  /**
   * True when the days of the newest timetable have been edited on a class with
   * a term behind it. That is the moment worth a question: those same days
   * could be a correction of the whole term, or a change that starts on a date.
   */
  const editedNewest =
    hasPastToKeep &&
    editing === periods.length - 1 &&
    !!savedCurrent &&
    savedPeriods.length === periods.length &&
    !periodsEqual(savedCurrent, current);

  /**
   * `answered` is passed rather than read from state on purpose: the two
   * buttons of the timetable question call straight into this in the same tick
   * they record the answer, and a state update is not visible until the next
   * render. Reading it from state there would put the question straight back up.
   */
  async function handleSave(
    confirmed = false,
    timeline = periods,
    answered = false
  ) {
    setError(null);
    if (!name.trim()) {
      setError('Give the class a name.');
      return;
    }
    // The timeline being saved, as stretches of dates. Not the `spans` on
    // screen: a change just recorded is in this one and not yet in that.
    const savedSpans = scheduleSpans(
      timeline,
      windowStart || null,
      windowEnd || null
    );
    const emptyDays = timeline.findIndex((p) => p.days.length === 0);
    if (emptyDays >= 0) {
      const named = savedSpans.length > 1 ? savedSpans[emptyDays] : null;
      setError(
        named
          ? `Pick at least one class day for "${formatSpan(named)}".`
          : 'Pick at least one class day.'
      );
      return;
    }
    if (start && end && end < start) {
      setError('The last class should be on or after the first.');
      return;
    }
    // Beyond this the schedule helpers refuse the range rather than walk it a
    // day at a time, so the class would silently show no classes at all. It is
    // always a mistyped year.
    if (start && end && differenceInCalendarDays(fromDateKey(end), fromDateKey(start)) > MAX_TERM_DAYS) {
      setError('Those dates are more than ten years apart. Check the year.');
      return;
    }
    // Only constrain dates to the semester when the class is linked to one.
    if (selectedSemester) {
      if (start && start < selectedSemester.start_date) {
        setError(
          `Classes can't start before ${selectedSemester.name} (${formatLongDate(
            selectedSemester.start_date
          )}).`
        );
        return;
      }
      if (end && end > selectedSemester.end_date) {
        setError(
          `Classes can't end after ${selectedSemester.name} (${formatLongDate(
            selectedSemester.end_date
          )}).`
        );
        return;
      }
    }
    // A change dated outside the term, or on top of the one before it, leaves a
    // stretch that covers no dates at all. Better said now than shown as a row
    // that quietly means nothing.
    const emptySpan = savedSpans.find(spanIsEmpty);
    if (emptySpan) {
      setError(
        emptySpan.index === 0
          ? 'The first timetable needs some term before the first change. Move that change later, or edit the first timetable instead.'
          : 'That change starts after the last class, so it never takes effect. Give it a date inside the term.'
      );
      return;
    }
    // Ask when the new days started before anything is saved: the same edit
    // can mean the timetable moved, or that it was wrong all along, and only
    // the person making it knows which.
    if (editedNewest && !decided && !answered) {
      setChangeFrom(todayKey());
      setAsking(true);
      return;
    }
    if (!confirmed) {
      const losses = await countLosses(timeline);
      if (losses) {
        setLosses(losses);
        return;
      }
    }
    setSaving(true);
    try {
      await saveCourse({
        id: course?.id,
        semester_id: semesterId || null,
        name,
        color,
        // The timetable running now, which is the newest on the timeline. Not
        // the stretch the toggles happen to be editing, which may be a past one.
        schedule_days: mirrorOf(timeline).days,
        sessions_per_day: mirrorOf(timeline).sessions_per_day,
        schedule_history: timeline,
        min_attendance_pct: minPct,
        start_date: start || null,
        end_date: end || null,
        // Drop anything now outside the window, so shrinking a term doesn't
        // leave invisible days off behind.
        excluded_dates:
          windowStart && windowEnd
            ? excluded.filter((d) => d >= windowStart && d <= windowEnd)
            : excluded,
      });
      setLosses(null);
      setAsking(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  /** "The timetable changed": record it, keeping what ran before the date. */
  function confirmChange() {
    if (!isDateKey(changeFrom)) {
      setError('Pick the date the new timetable started.');
      return;
    }
    if (periods.length > MAX_SCHEDULE_CHANGES) {
      setError('That is as many timetable changes as one class can hold.');
      return;
    }
    const timeline = applyScheduleChange(
      periods,
      editing,
      savedCurrent,
      changeFrom
    );
    setPeriods(timeline);
    setEditing(
      Math.max(timeline.findIndex((p) => p.effective_from === changeFrom), 0)
    );
    setAsking(false);
    setDecided(true);
    setError(null);
    void handleSave(false, timeline, true);
  }

  /** "It has always been this way": the edit stands for the whole stretch. */
  function confirmCorrection() {
    setAsking(false);
    setDecided(true);
    setError(null);
    void handleSave(false, periods, true);
  }

  async function handleArchive(archived: boolean) {
    if (!course) return;
    setSaving(true);
    try {
      await setCourseArchived(course.id, archived);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!course) return;
    setSaving(true);
    try {
      await deleteCourse(course.id);
      if (onDeleted) onDeleted();
      else onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit class' : 'New class'}
    >
      <div className="space-y-6 pb-2">
        <Input
          label="Class name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Victorian Literature"
          autoComplete="off"
        />

        <div>
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">Colour</p>
          <CourseColorPicker value={color} onChange={setColor} />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-sans text-xs font-medium text-ink-500">
              Class days
            </p>
            {spans.length > 1 && (
              <span className="font-sans text-[11px] text-ink-300">
                {formatSpan(spans[editing] ?? spans[0])}
              </span>
            )}
          </div>

          {/* The timetable over time, once there is more than one of them.
              Tapping a stretch points the day toggles at it, so the days a
              past stretch ran on stay readable and can still be put right. */}
          {spans.length > 1 && (
            <div className="mb-2.5 space-y-1.5 rounded-card bg-parchment-100 p-2">
              <p className="flex items-center gap-1.5 px-1 pt-0.5 font-sans text-[11px] text-ink-500">
                <CalendarClock size={13} />
                This class has changed its days. Tap a stretch to edit it.
              </p>
              {spans.map((span) => {
                const active = span.index === editing;
                return (
                  <button
                    key={`${span.period.effective_from ?? 'start'}-${span.index}`}
                    type="button"
                    onClick={() => selectSpan(span.index)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                      active
                        ? 'bg-parchment-50 ring-1 ring-inset ring-sage-400'
                        : 'bg-parchment-50/60'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-sm text-ink-900">
                        {formatDays(span.period)}
                      </span>
                      <span className="block font-sans text-[11px] text-ink-500">
                        {formatSpan(span)}
                        {spanIsEmpty(span) && ' · covers no dates'}
                      </span>
                    </span>
                    {active && (
                      <span className="shrink-0 text-sage-500">
                        <Check size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-between gap-1.5">
            {WEEK_ORDER.map((day) => {
              const active = days.includes(day);
              return (
                <motion.button
                  key={day}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleDay(day)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-lg font-sans text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sage-500 text-white'
                      : 'bg-parchment-200 text-ink-500'
                  }`}
                >
                  {DAY_SHORT[day]}
                  {active && (perDay[day] ?? 1) > 1 && (
                    <span className="ml-0.5 text-[11px] opacity-80">
                      ×{perDay[day]}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {editedNewest && !asking && (
            <p className="mt-2.5 flex items-start gap-1.5 font-sans text-[11px] text-ink-500">
              <CalendarClock size={13} className="mt-px shrink-0" />
              <span>
                Saving will ask whether the timetable changed on a date, or was
                wrong all along. Nothing you have marked is lost either way.
              </span>
            </p>
          )}

          {editing > 0 && (
            <div className="mt-2.5 space-y-2 rounded-card bg-parchment-100 p-2.5">
              <label className="block font-sans text-[11px] text-ink-500">
                These days start from
              </label>
              <DateInput
                value={changeDraft || (current.effective_from ?? '')}
                min={
                  periods[editing - 1]?.effective_from
                    ? nextDay(periods[editing - 1].effective_from as string)
                    : windowStart
                      ? nextDay(windowStart)
                      : undefined
                }
                max={windowEnd || undefined}
                onChange={(e) => moveChange(e.target.value)}
              />
              <p className="font-sans text-[11px] text-ink-300">
                Everything before this keeps the timetable above it.
              </p>
              <Button
                variant="ghost"
                fullWidth
                onClick={dropChange}
                disabled={saving}
                className="justify-start text-rose-600"
              >
                <RotateCcw size={15} />
                Undo this change
              </Button>
            </div>
          )}

          {days.length > 0 && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setPerDayOpen((v) => !v)}
                aria-expanded={perDayOpen}
                className="flex w-full items-baseline gap-1.5"
              >
                <p className="font-sans text-xs font-medium text-ink-500">
                  More than one class a day
                </p>
                <span className="font-sans text-[11px] text-ink-300">
                  {doubleDays.length > 0
                    ? doubleDays
                        .map((d) => `${DAY_LABELS[d]} ×${perDay[d]}`)
                        .join(' · ')
                    : 'Optional'}
                </span>
                <motion.span
                  animate={{ rotate: perDayOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="ml-auto text-ink-300"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {perDayOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
                      opacity: { duration: 0.18, ease: 'easeOut' },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5 rounded-card bg-parchment-100 p-2.5">
                      <p className="px-1 font-sans text-xs text-ink-500">
                        A double lecture is two classes, each marked on its own.
                      </p>
                      {WEEK_ORDER.filter((d) => days.includes(d)).map((day) => (
                        <DayCountRow
                          key={day}
                          label={DAY_LABELS[day]}
                          count={perDay[day] ?? 1}
                          onChange={(n) => setDayCount(day, n)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">
            Semester
          </p>
          <select
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setLosses(null);
            }}
            className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
          >
            <option value={NO_SEMESTER}>No semester (standalone)</option>
            {offerableSemesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.archived_at ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-sans text-xs font-medium text-ink-500">
              Class dates
            </p>
            <span className="font-sans text-[11px] text-ink-300">
              {selectedSemester ? 'Within the semester' : 'Optional'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-sans text-[11px] text-ink-500">
                First class
              </label>
              <DateInput
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setLosses(null);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block font-sans text-[11px] text-ink-500">
                Last class
              </label>
              <DateInput
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setLosses(null);
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setDaysOffOpen((v) => !v)}
            aria-expanded={daysOffOpen}
            className="mb-2 flex w-full items-baseline gap-1.5"
          >
            <p className="font-sans text-xs font-medium text-ink-500">Days off</p>
            <span className="font-sans text-[11px] text-ink-300">
              {offCount > 0
                ? `${offCount} taken out`
                : windowStart && windowEnd && days.length > 0
                  ? 'Holidays and breaks'
                  : 'Optional'}
            </span>
            <motion.span
              animate={{ rotate: daysOffOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="ml-auto text-ink-300"
            >
              <ChevronDown size={18} />
            </motion.span>
          </button>

          {classCount > 0 && (
            <p className="mb-2 font-sans text-sm text-ink-700">
              {classCount} {classCount === 1 ? 'class' : 'classes'} in the term
              {offCount > 0 && (
                <span className="text-ink-300">
                  {' '}
                  · {offCount} {offCount === 1 ? 'day' : 'days'} off
                </span>
              )}
            </p>
          )}

          <AnimatePresence initial={false}>
            {daysOffOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
                  opacity: { duration: 0.18, ease: 'easeOut' },
                }}
                className="overflow-hidden"
              >
                <DaysOffPicker
                  periods={periods}
                  start={windowStart}
                  end={windowEnd}
                  value={excluded}
                  onChange={changeDaysOff}
                  color={color}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">
            Minimum attendance
          </p>
          <div className="flex items-center justify-between rounded-lg bg-parchment-200 p-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setMinPct((p) => Math.max(50, p - 5))}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-parchment-50 text-ink-700"
              aria-label="Decrease"
            >
              <Minus size={16} />
            </motion.button>
            <span className="font-serif text-2xl text-ink-900">{minPct}%</span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setMinPct((p) => Math.min(100, p + 5))}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-parchment-50 text-ink-700"
              aria-label="Increase"
            >
              <Plus size={16} />
            </motion.button>
          </div>
        </div>

        {error && <p className="font-sans text-sm text-rose-600">{error}</p>}

        <div className="space-y-3">
          {asking ? (
            /* The same edit can mean two different things, and only the person
               making it knows which: the days moved on a date, or they were
               wrong all along. Nothing is saved until this is answered. */
            <div className="space-y-3 rounded-card bg-parchment-200 p-3.5">
              <p className="font-sans text-sm font-medium text-ink-900">
                Has the timetable changed?
              </p>
              <p className="font-sans text-sm text-ink-700">
                This class has been {savedCurrent ? formatDays(savedCurrent) : ''}
                . You have just set it to {formatDays(current)}.
              </p>
              <div className="space-y-2 rounded-card bg-parchment-50 p-3">
                <label className="block font-sans text-[11px] text-ink-500">
                  The new timetable starts
                </label>
                <DateInput
                  value={changeFrom}
                  min={changeMin}
                  max={windowEnd || undefined}
                  onChange={(e) => setChangeFrom(e.target.value)}
                />
                <p className="font-sans text-[11px] text-ink-500">
                  Everything before this keeps{' '}
                  {savedCurrent ? formatDays(savedCurrent) : 'the old days'}, and
                  the classes you marked on those days stay exactly as they are.
                </p>
                <Button fullWidth onClick={confirmChange} disabled={saving}>
                  Save the change
                </Button>
              </div>
              <p className="font-sans text-[11px] text-ink-500">
                Or, if the days were entered wrongly to begin with, put the whole
                term right instead:
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={confirmCorrection}
                disabled={saving}
              >
                It has always been {formatDays(current)}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setAsking(false)}
                disabled={saving}
              >
                Go back
              </Button>
            </div>
          ) : losses ? (
            <div className="space-y-3 rounded-card bg-amber-100 p-3.5">
              <p className="font-sans text-sm font-medium text-amber-600">
                These changes leave part of the class behind.
              </p>
              <ul className="space-y-1.5 font-sans text-sm text-ink-700">
                {losses.strandedMarks > 0 && (
                  <li>
                    {losses.strandedMarks} marked{' '}
                    {losses.strandedMarks === 1 ? 'class falls' : 'classes fall'}{' '}
                    outside the new dates. They stay in your records and still
                    count towards your percentage, but they drop off the overview
                    grid for this class.
                  </li>
                )}
                {losses.strandedBySchedule > 0 && (
                  <li>
                    {losses.strandedBySchedule} marked{' '}
                    {losses.strandedBySchedule === 1 ? 'class sits' : 'classes sit'}{' '}
                    on a day the new schedule no longer holds. They stay in your
                    records and still count towards your percentage, but the term
                    stops expecting them.
                  </li>
                )}
                {losses.lostDaysOff > 0 && (
                  <li>
                    {losses.lostDaysOff}{' '}
                    {losses.lostDaysOff === 1 ? 'day off' : 'days off'} you marked
                    outside the new dates will be forgotten. Widening the dates
                    again will not bring them back.
                  </li>
                )}
              </ul>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setLosses(null)}
                  disabled={saving}
                >
                  Go back
                </Button>
                <Button
                  fullWidth
                  onClick={() => void handleSave(true)}
                  disabled={saving}
                >
                  Save anyway
                </Button>
              </div>
            </div>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {isEdit ? 'Save changes' : 'Add class'}
            </Button>
          )}

          {isEdit &&
            !losses &&
            !asking &&
            (archivedBySemester ? (
              // Its term is archived, so the class follows it. Restoring the
              // class on its own wouldn't bring it back.
              <p className="rounded-card bg-parchment-200 px-3.5 py-3 font-sans text-sm text-ink-500">
                In the archive with {selectedSemester?.name}. Restore that term
                to bring this class back with it.
              </p>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleArchive(!course?.archived_at)}
                disabled={saving}
                className="justify-start"
              >
                {course?.archived_at ? (
                  <>
                    <RotateCcw size={16} />
                    Restore from archive
                  </>
                ) : (
                  <>
                    <Archive size={16} />
                    Archive class
                  </>
                )}
              </Button>
            ))}

          {isEdit &&
            !losses &&
            !asking &&
            (confirmDelete ? (
              <div className="space-y-3 rounded-card bg-rose-100 p-3.5">
                <p className="font-sans text-sm text-ink-700">
                  {markedCount && markedCount > 0
                    ? `This class has ${markedCount} marked ${
                        markedCount === 1 ? 'session' : 'sessions'
                      }. Deleting removes the whole class along with its schedule and all of its attendance. This can't be undone.`
                    : "This removes the whole class and its schedule. This can't be undone."}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setConfirmDelete(false)}
                    disabled={saving}
                  >
                    Keep class
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete anyway
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                fullWidth
                onClick={askDelete}
                disabled={saving}
                className="text-rose-600"
              >
                <Trash2 size={16} />
                Delete class
              </Button>
            ))}
        </div>
      </div>
    </BottomSheet>
  );
}
