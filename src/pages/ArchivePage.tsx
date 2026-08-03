import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Archive, ChevronLeft, RotateCcw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressRing } from '../components/ui/ProgressRing';
import { CourseCardSkeleton } from '../components/ui/Skeleton';
import { useCourseView } from '../hooks/useCourseView';
import { useCourseMutations } from '../hooks/useCourses';
import { useSemesterMutations } from '../hooks/useSemesters';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import { isArchivedRecord } from '../lib/archive';
import { listContainer, listItem } from '../lib/motion';
import { formatLongDate } from '../utils/dates';
import type { Course, Semester } from '../types';

interface Group {
  key: string;
  /** The semester these classes belong to, or null for standalone ones. */
  semester: Semester | null;
  /** True when the semester itself is archived, not just its classes. */
  semesterArchived: boolean;
  courses: Course[];
}

/**
 * Everything that's been put away: finished terms and the classes inside them,
 * plus any class archived on its own. Nothing here is deleted, so each row
 * still opens its full attendance record, and anything can be brought back.
 */
export function ArchivePage() {
  const navigate = useNavigate();
  const { archivedCourses, archivedSemesters, semesterOf, isLoading } =
    useCourseView();
  const { setCourseArchived } = useCourseMutations();
  const { setSemesterArchived } = useSemesterMutations();

  // Grouped by semester, newest term first, with standalone classes last.
  const groups = useMemo(() => {
    const bySemester = new Map<string, Group>();
    const standalone: Course[] = [];

    for (const course of archivedCourses) {
      const semester = semesterOf(course);
      if (!semester) {
        standalone.push(course);
        continue;
      }
      const existing = bySemester.get(semester.id);
      if (existing) existing.courses.push(course);
      else
        bySemester.set(semester.id, {
          key: semester.id,
          semester,
          semesterArchived: isArchivedRecord(semester),
          courses: [course],
        });
    }

    // An archived semester with no classes left should still be listed, so it
    // can be found and restored.
    for (const semester of archivedSemesters) {
      if (bySemester.has(semester.id)) continue;
      bySemester.set(semester.id, {
        key: semester.id,
        semester,
        semesterArchived: true,
        courses: [],
      });
    }

    const list = [...bySemester.values()].sort((a, b) =>
      (b.semester?.start_date ?? '').localeCompare(a.semester?.start_date ?? '')
    );
    if (standalone.length > 0) {
      list.push({
        key: 'standalone',
        semester: null,
        semesterArchived: false,
        courses: standalone,
      });
    }
    return list;
  }, [archivedCourses, archivedSemesters, semesterOf]);

  const isEmpty = !isLoading && groups.length === 0;

  return (
    <div className="pb-24 md:pb-2">
      <PageHeader
        title="Archive"
        subtitle={
          isEmpty
            ? 'Nothing put away yet'
            : `${archivedCourses.length} ${
                archivedCourses.length === 1 ? 'class' : 'classes'
              }`
        }
        left={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      )}

      {isEmpty && (
        <div className="mt-16 flex flex-col items-center px-6 text-center">
          <Archive size={28} className="text-ink-300" />
          <h2 className="mt-3 font-serif text-2xl text-ink-900">
            The archive is empty
          </h2>
          <p className="mt-2 font-sans text-sm text-ink-500">
            Classes move here on their own once their last class has passed, and
            you can put one away early from its edit sheet at any time.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 font-sans text-sm font-medium text-sage-600"
          >
            Back to your classes
          </Link>
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="font-sans text-base font-medium text-ink-900">
                  {group.semester?.name ?? 'Standalone classes'}
                </h2>
                {group.semester && (
                  <p className="font-sans text-[11px] text-ink-300">
                    ended {formatLongDate(group.semester.end_date)}
                  </p>
                )}
                {group.semesterArchived && group.semester && (
                  <button
                    type="button"
                    onClick={() =>
                      void setSemesterArchived(group.semester!.id, false)
                    }
                    className="ml-auto flex shrink-0 items-center gap-1 font-sans text-xs font-medium text-sage-600"
                  >
                    <RotateCcw size={13} />
                    Restore term
                  </button>
                )}
              </div>

              {group.courses.length === 0 ? (
                <p className="rounded-card bg-parchment-50 p-4 font-sans text-sm text-ink-500 shadow-sm">
                  No classes in this term.
                </p>
              ) : (
                <motion.div
                  variants={listContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 gap-2 md:grid-cols-2"
                >
                  {group.courses.map((course) => (
                    <ArchivedCourseRow
                      key={course.id}
                      course={course}
                      // A class inside an archived term is restored with the
                      // term, so it doesn't offer its own restore button.
                      canRestore={!group.semesterArchived}
                      onRestore={() => void setCourseArchived(course.id, false)}
                    />
                  ))}
                </motion.div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedCourseRow({
  course,
  canRestore,
  onRestore,
}: {
  course: Course;
  canRestore: boolean;
  onRestore: () => void;
}) {
  const navigate = useNavigate();
  const stats = useAttendanceStats(course);
  const hasSessions = stats !== null && stats.total > 0;

  return (
    <motion.div
      variants={listItem}
      className="flex items-center gap-3 rounded-card bg-parchment-50 p-3.5 shadow-sm"
    >
      <button
        type="button"
        onClick={() => navigate(`/courses/${course.id}`)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ProgressRing
          value={stats?.percentage ?? 0}
          threshold={course.min_attendance_pct}
          size={44}
          strokeWidth={5}
          color={hasSessions ? undefined : '#D4D2CB'}
        >
          <span className="font-sans text-[10px] font-medium text-ink-700">
            {hasSessions ? `${Math.round(stats!.percentage)}` : '–'}
          </span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-medium text-ink-900">
            {course.name}
          </p>
          <p className="font-sans text-xs text-ink-500">
            {hasSessions
              ? `${stats!.present} of ${stats!.total} attended`
              : 'Nothing recorded'}
          </p>
        </div>
      </button>

      {canRestore && (
        <button
          type="button"
          onClick={onRestore}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500"
          aria-label={`Restore ${course.name}`}
          title="Restore"
        >
          <RotateCcw size={16} />
        </button>
      )}
    </motion.div>
  );
}
