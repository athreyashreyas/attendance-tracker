import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, CalendarCheck } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { CourseCard } from '../components/courses/CourseCard';
import { CourseForm } from '../components/courses/CourseForm';
import { CourseCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { useActiveSemester } from '../hooks/useSemesters';
import { useCourses } from '../hooks/useCourses';
import { listContainer, spring } from '../lib/motion';
import type { Course, ScheduleDay } from '../types';

export function DashboardPage() {
  const semester = useActiveSemester();
  const { data: courses, isLoading } = useCourses(semester?.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const todayDow = new Date().getDay() as ScheduleDay;
  const scheduledToday = (courses ?? []).filter((c) =>
    c.schedule_days.includes(todayDow)
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(course: Course) {
    setEditing(course);
    setFormOpen(true);
  }

  const showEmpty = !isLoading && (courses?.length ?? 0) === 0;

  return (
    <div className="relative pb-24 md:pb-2">
      <PageHeader
        title="Attend"
        subtitle={semester?.name ?? 'No active semester'}
        right={<SyncIndicator />}
      />

      {scheduledToday.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-5"
        >
          <Link
            to="/quick-mark"
            className="flex items-center gap-3 rounded-card bg-sage-500 p-4 text-white shadow-sm"
          >
            <CalendarCheck size={22} />
            <div className="flex-1">
              <p className="font-sans text-sm font-semibold">
                Mark today&apos;s classes
              </p>
              <p className="font-sans text-xs text-sage-50/90">
                {scheduledToday.length} class
                {scheduledToday.length === 1 ? '' : 'es'} scheduled today
              </p>
            </div>
            <span className="font-serif text-2xl">→</span>
          </Link>
        </motion.div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      )}

      {showEmpty && (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <h2 className="font-serif text-2xl text-ink-900">
            Add your first course
          </h2>
          <p className="mt-2 font-sans text-sm text-ink-500">
            Track attendance for each class and stay above your threshold.
          </p>
          {semester && (
            <Button className="mt-6" size="lg" onClick={openAdd}>
              <Plus size={18} />
              New course
            </Button>
          )}
          {!semester && (
            <p className="mt-6 font-sans text-sm text-ink-300">
              Create a semester in Settings to get started.
            </p>
          )}
        </div>
      )}

      {!isLoading && !showEmpty && (
        <motion.div
          variants={listContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {courses!.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              semester={semester}
              onEdit={openEdit}
            />
          ))}
        </motion.div>
      )}

      {semester && !showEmpty && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={openAdd}
          className="fixed bottom-[calc(5rem+var(--safe-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-fab bg-sage-500 text-white shadow-lg md:bottom-8 md:right-8"
          aria-label="Add course"
        >
          <Plus size={26} />
        </motion.button>
      )}

      <CourseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        semesterId={semester?.id ?? ''}
        course={editing}
      />
    </div>
  );
}
