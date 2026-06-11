import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CourseColorPicker } from './CourseColorPicker';
import { useCourseMutations } from '../../hooks/useCourses';
import { DEFAULT_COURSE_COLOR } from '../../lib/colors';
import { WEEK_ORDER } from '../../utils/dates';
import type { Course, ScheduleDay } from '../../types';

const DAY_SHORT: Record<number, string> = {
  0: 'Su',
  1: 'Mo',
  2: 'Tu',
  3: 'We',
  4: 'Th',
  5: 'Fr',
  6: 'Sa',
};

interface CourseFormProps {
  open: boolean;
  onClose: () => void;
  semesterId: string;
  course?: Course | null;
}

export function CourseForm({ open, onClose, semesterId, course }: CourseFormProps) {
  const { saveCourse, deleteCourse } = useCourseMutations();
  const isEdit = !!course;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COURSE_COLOR);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [minPct, setMinPct] = useState(75);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset fields whenever the sheet opens for a (different) course.
  useEffect(() => {
    if (!open) return;
    setName(course?.name ?? '');
    setColor(course?.color ?? DEFAULT_COURSE_COLOR);
    setDays(course?.schedule_days ?? []);
    setMinPct(course?.min_attendance_pct ?? 75);
    setError(null);
    setConfirmDelete(false);
  }, [open, course]);

  function toggleDay(day: ScheduleDay) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Give the course a name.');
      return;
    }
    if (days.length === 0) {
      setError('Pick at least one class day.');
      return;
    }
    setSaving(true);
    try {
      await saveCourse({
        id: course?.id,
        semester_id: semesterId,
        name,
        color,
        schedule_days: [...days].sort((a, b) => a - b),
        min_attendance_pct: minPct,
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
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit course' : 'New course'}
    >
      <div className="space-y-6 pb-2">
        <Input
          label="Course name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Victorian Literature"
          autoFocus={!isEdit}
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
            {isEdit ? 'Save changes' : 'Add course'}
          </Button>

          {isEdit &&
            (confirmDelete ? (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete course
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="text-rose-600"
              >
                <Trash2 size={16} />
                Delete course
              </Button>
            ))}
        </div>
      </div>
    </BottomSheet>
  );
}
