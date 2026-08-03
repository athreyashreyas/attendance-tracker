import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateInput } from '../ui/DateInput';
import { CourseColorPicker } from './CourseColorPicker';
import { DaysOffPicker } from './DaysOffPicker';
import { useCourseMutations } from '../../hooks/useCourses';
import { db } from '../../lib/db';
import { DEFAULT_COURSE_COLOR } from '../../lib/colors';
import { countClassDays } from '../../lib/calculations';
import { WEEK_ORDER, formatLongDate } from '../../utils/dates';
import type { Course, ScheduleDay, Semester } from '../../types';

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
  const { saveCourse, deleteCourse } = useCourseMutations();
  const isEdit = !!course;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COURSE_COLOR);
  const [days, setDays] = useState<ScheduleDay[]>([]);
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

  // Reset fields whenever the sheet opens for a (different) course.
  useEffect(() => {
    if (!open) return;
    setName(course?.name ?? '');
    setColor(course?.color ?? DEFAULT_COURSE_COLOR);
    setDays(course?.schedule_days ?? []);
    setMinPct(course?.min_attendance_pct ?? 75);
    setSemesterId(course?.semester_id ?? defaultSemesterId ?? NO_SEMESTER);
    setStart(course?.start_date ?? '');
    setEnd(course?.end_date ?? '');
    setExcluded(course?.excluded_dates ?? []);
    setDaysOffOpen(false);
    setError(null);
    setConfirmDelete(false);
    setMarkedCount(null);
  }, [open, course, defaultSemesterId]);

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

  // Days off are picked against whatever window the class will actually run in:
  // its own dates when set, otherwise the semester it belongs to.
  const windowStart = start || selectedSemester?.start_date || '';
  const windowEnd = end || selectedSemester?.end_date || '';

  const classCount = useMemo(
    () => countClassDays(days, windowStart, windowEnd, excluded),
    [days, windowStart, windowEnd, excluded]
  );
  // Only days off that land on a real class day inside the window count.
  const offCount = useMemo(
    () => countClassDays(days, windowStart, windowEnd, []) - classCount,
    [days, windowStart, windowEnd, classCount]
  );

  function toggleDay(day: ScheduleDay) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Give the class a name.');
      return;
    }
    if (days.length === 0) {
      setError('Pick at least one class day.');
      return;
    }
    if (start && end && end < start) {
      setError('The last class should be on or after the first.');
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
    setSaving(true);
    try {
      await saveCourse({
        id: course?.id,
        semester_id: semesterId || null,
        name,
        color,
        schedule_days: [...days].sort((a, b) => a - b),
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
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">
            Class days
          </p>
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
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">
            Semester
          </p>
          <select
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="w-full rounded-lg border-0 bg-parchment-50 px-3 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 focus:ring-2 focus:ring-inset focus:ring-sage-400"
          >
            <option value={NO_SEMESTER}>No semester (standalone)</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
              <DateInput value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block font-sans text-[11px] text-ink-500">
                Last class
              </label>
              <DateInput value={end} onChange={(e) => setEnd(e.target.value)} />
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
                  scheduleDays={days}
                  start={windowStart}
                  end={windowEnd}
                  value={excluded}
                  onChange={setExcluded}
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
          <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
            {isEdit ? 'Save changes' : 'Add class'}
          </Button>

          {isEdit &&
            (confirmDelete ? (
              <div className="space-y-3 rounded-card bg-rose-50 p-3.5">
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
