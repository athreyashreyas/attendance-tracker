import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { CourseCard } from '../components/courses/CourseCard';
import { CourseForm } from '../components/courses/CourseForm';
import { ViewFilterBar } from '../components/courses/ViewFilterBar';
import { CourseCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Fab } from '../components/ui/Fab';
import { useCourseView } from '../hooks/useCourseView';
import { useAllSessions } from '../hooks/useSessions';
import { todayKey } from '../utils/dates';
import { listContainer, spring } from '../lib/motion';
import type { Course, ScheduleDay } from '../types';

export function DashboardPage() {
  const { filter, setFilter, courses, allCourses, semesters, isLoading, semesterOf } =
    useCourseView();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const { data: allSessions } = useAllSessions();
  const today = todayKey();

  const hasStandalone = allCourses.some((c) => !c.semester_id);

  // Sessions already on today's date: decided ones (present/absent/cancelled)
  // need no marking; a planned one is an ad-hoc class today that still does.
  const sessionToday = useMemo(() => {
    const decided = new Set<string>();
    const planned = new Set<string>();
    for (const s of allSessions ?? []) {
      if (s.scheduled_date !== today) continue;
      if (s.status === 'planned') planned.add(s.course_id);
      else decided.add(s.course_id);
    }
    return { decided, planned };
  }, [allSessions, today]);

  // "Mark today" spans every class with a class today (a recurring day or an
  // ad-hoc session) that still needs a mark, regardless of the active filter,
  // so cancelled or already-marked days don't keep nagging.
  const todayDow = new Date().getDay() as ScheduleDay;
  const toMarkToday = allCourses.filter(
    (c) =>
      (c.schedule_days.includes(todayDow) || sessionToday.planned.has(c.id)) &&
      !sessionToday.decided.has(c.id)
  );

  // A brand-new class defaults to the semester you're currently viewing.
  const defaultSemesterId =
    filter === 'all' || filter === 'other' ? null : filter;

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(course: Course) {
    setEditing(course);
    setFormOpen(true);
  }

  const showEmpty = !isLoading && courses.length === 0;

  const subtitle =
    filter === 'all'
      ? 'All classes'
      : filter === 'other'
        ? 'Standalone classes'
        : (semesters.find((s) => s.id === filter)?.name ?? 'All classes');

  return (
    <div className="relative pb-24 md:pb-2">
      <PageHeader title="Attend" subtitle={subtitle} right={<SyncIndicator />} />

      <ViewFilterBar
        filter={filter}
        onChange={setFilter}
        semesters={semesters}
        hasStandalone={hasStandalone}
      />

      {toMarkToday.length > 0 && (
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
                {toMarkToday.length} class
                {toMarkToday.length === 1 ? '' : 'es'} left to mark today
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
            {allCourses.length === 0 ? 'Add your first class' : 'Nothing here yet'}
          </h2>
          <p className="mt-2 font-sans text-sm text-ink-500">
            {allCourses.length === 0
              ? 'Track attendance for each class and stay above your threshold.'
              : 'No classes in this view. Add one or switch filters.'}
          </p>
          <Button className="mt-6" size="lg" onClick={openAdd}>
            <span className="font-serif text-lg leading-none">+</span>
            New class
          </Button>
        </div>
      )}

      {!isLoading && !showEmpty && (
        <motion.div
          variants={listContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              semester={semesterOf(course)}
              onEdit={openEdit}
            />
          ))}
        </motion.div>
      )}

      {!showEmpty && <Fab onClick={openAdd} label="Add class" />}

      <CourseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        course={editing}
        semesters={semesters}
        defaultSemesterId={defaultSemesterId}
      />
    </div>
  );
}
