import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Archive, ArrowUpDown, CalendarCheck, Check } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { CourseCard } from '../components/courses/CourseCard';
import { CourseForm } from '../components/courses/CourseForm';
import { CourseArranger } from '../components/courses/CourseArranger';
import { ViewFilterBar } from '../components/courses/ViewFilterBar';
import { CourseCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Fab } from '../components/ui/Fab';
import { useCourseView } from '../hooks/useCourseView';
import { useCourseMutations } from '../hooks/useCourses';
import { useTodayMarking } from '../hooks/useTodayMarking';
import { listContainer, spring } from '../lib/motion';
import type { Course } from '../types';

export function DashboardPage() {
  const {
    filter,
    setFilter,
    courses,
    allCourses,
    archivedCourses,
    semesters,
    isLoading,
    semesterOf,
  } = useCourseView();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  /**
   * Arranging is a mode you step into rather than a gesture you might trip
   * over: a card is already tapped to open it and held to edit it, and a third
   * meaning for the same press would make all three feel uncertain.
   */
  const [arranging, setArranging] = useState(false);
  const { reorderCourses } = useCourseMutations();

  const hasStandalone = allCourses.some((c) => !c.semester_id);

  // Classes still needing a mark today, regardless of the active filter, so
  // cancelled or already-marked days don't keep nagging.
  const { toMark: toMarkToday } = useTodayMarking();

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
  // Nothing to arrange until there are two of them.
  const canArrange = !isLoading && courses.length > 1;
  // Derived rather than corrected: a filter that leaves one class behind, or
  // none, simply has nothing to arrange, and the mode falls away with it
  // instead of being switched off after the fact.
  const isArranging = arranging && canArrange;

  const subtitle =
    filter === 'all'
      ? 'All classes'
      : filter === 'other'
        ? 'Standalone classes'
        : (semesters.find((s) => s.id === filter)?.name ?? 'All classes');

  return (
    <div className="relative pb-24 md:pb-2">
      <PageHeader title="Attend" subtitle={subtitle} />

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
            {allCourses.length === 0
              ? 'Add your first class'
              : filter === 'other'
                ? 'No standalone classes'
                : filter !== 'all'
                  ? `Nothing in ${semesters.find((s) => s.id === filter)?.name ?? 'this semester'}`
                  : 'Nothing here yet'}
          </h2>
          <p className="mt-2 font-sans text-sm text-ink-500">
            {allCourses.length === 0
              ? 'Track attendance for each class and stay above your threshold.'
              : filter === 'other'
                ? 'Classes without a semester show up here.'
                : filter !== 'all'
                  ? 'Add a class to this semester, or switch to All to see everything.'
                  : 'Add a class to get started.'}
          </p>
          <Button className="mt-6" size="lg" onClick={openAdd}>
            <span className="font-serif text-lg leading-none">+</span>
            New class
          </Button>
        </div>
      )}

      {canArrange && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {isArranging && (
            <p className="min-w-0 font-sans text-xs text-ink-300">
              Drag by the handle, or use the arrows.
            </p>
          )}
          <button
            type="button"
            onClick={() => setArranging((a) => !a)}
            aria-pressed={isArranging}
            className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
              isArranging
                ? 'bg-sage-500 text-white'
                : 'bg-parchment-200 text-ink-500'
            }`}
          >
            {isArranging ? <Check size={14} /> : <ArrowUpDown size={14} />}
            {isArranging ? 'Done' : 'Arrange'}
          </button>
        </div>
      )}

      {!isLoading && !showEmpty && isArranging && (
        <CourseArranger
          courses={courses}
          semesterOf={semesterOf}
          onReorder={(orderedIds) =>
            void reorderCourses({ all: allCourses, orderedIds })
          }
        />
      )}

      {!isLoading && !showEmpty && !isArranging && (
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

      {!isLoading && archivedCourses.length > 0 && (
        <Link
          to="/archive"
          className="mt-6 flex items-center justify-center gap-1.5 font-sans text-sm text-ink-500"
        >
          <Archive size={15} />
          {archivedCourses.length} archived{' '}
          {archivedCourses.length === 1 ? 'class' : 'classes'}
        </Link>
      )}

      {!showEmpty && !isArranging && <Fab onClick={openAdd} label="Add class" />}

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
