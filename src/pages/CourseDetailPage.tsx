import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Skeleton } from '../components/ui/Skeleton';
import { Fab } from '../components/ui/Fab';
import { SessionItem } from '../components/sessions/SessionItem';
import { SessionForm } from '../components/sessions/SessionForm';
import { CourseForm } from '../components/courses/CourseForm';
import { AttendanceHeatmap } from '../components/calendar/AttendanceHeatmap';
import { useCourse } from '../hooks/useCourses';
import { useSessions } from '../hooks/useSessions';
import { useSemesters } from '../hooks/useSemesters';
import { useAttendanceStats, useTermProjection } from '../hooks/useAttendanceStats';
import { TONE_CLASSES } from '../lib/status';
import { formatMonthLabel, fromDateKey } from '../utils/dates';
import { listContainer } from '../lib/motion';
import type { Session, TermProjection } from '../types';

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading } = useCourse(id);
  const { data: sessions } = useSessions(id);
  const { data: semesters } = useSemesters();
  const stats = useAttendanceStats(course);

  const [sessionForm, setSessionForm] = useState<{
    open: boolean;
    session: Session | null;
    date?: string;
  }>({ open: false, session: null });
  const [editCourse, setEditCourse] = useState(false);

  const semester = useMemo(
    () => semesters?.find((s) => s.id === course?.semester_id) ?? null,
    [semesters, course]
  );
  const proj = useTermProjection(course, semester);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Session[] }[] = [];
    for (const s of sessions ?? []) {
      const label = formatMonthLabel(fromDateKey(s.scheduled_date));
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(s);
      else groups.push({ label, items: [s] });
    }
    return groups;
  }, [sessions]);

  if (isLoading || !course) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const winStart = course.start_date ?? semester?.start_date ?? null;
  const winEnd = course.end_date ?? semester?.end_date ?? null;
  const hasWindow = !!winStart && !!winEnd;

  function openNewSession() {
    setSessionForm({ open: true, session: null });
  }
  function openEditSession(session: Session) {
    setSessionForm({ open: true, session });
  }

  return (
    <div className="relative mx-auto max-w-3xl pb-24 md:pb-2">
      <PageHeader
        title={course.name}
        subtitle={semester?.name ?? 'Standalone'}
        left={
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
        }
        right={
          <button
            type="button"
            onClick={() => setEditCourse(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
            aria-label="Edit class"
          >
            <Pencil size={18} />
          </button>
        }
      />

      {/* Stats strip */}
      <div className="flex items-center gap-5 rounded-card bg-parchment-50 p-5 shadow-sm">
        <ProgressRing
          value={stats?.percentage ?? 0}
          threshold={course.min_attendance_pct}
          size={104}
          strokeWidth={9}
          color={stats && stats.total > 0 ? undefined : '#D4D2CB'}
        >
          <div className="text-center">
            <span className="block font-serif text-2xl text-ink-900">
              {stats && stats.total > 0 ? `${Math.round(stats.percentage)}%` : ''}
            </span>
            <span className="font-sans text-[10px] text-ink-500">
              of {course.min_attendance_pct}%
            </span>
          </div>
        </ProgressRing>

        <div className="grid flex-1 grid-cols-2 gap-y-3">
          <Stat label="Total" value={stats?.total ?? 0} />
          <Stat label="Present" value={stats?.present ?? 0} />
          <Stat label="Absent" value={stats?.absent ?? 0} />
          <Stat label="Cancelled" value={stats?.cancelled ?? 0} />
        </div>
      </div>

      {/* Threshold / projection callout */}
      {proj && proj.remaining > 0 ? (
        <ProjectionCallout proj={proj} threshold={course.min_attendance_pct} />
      ) : (
        stats && stats.total > 0 && <ThresholdCallout stats={stats} />
      )}

      {/* Session list */}
      <div className="mt-6">
        <h2 className="mb-3 font-sans text-base font-medium text-ink-900">
          Classes
        </h2>
        {grouped.length === 0 ? (
          <p className="rounded-card bg-parchment-50 p-5 text-center font-sans text-sm text-ink-500 shadow-sm">
            No classes recorded yet. Tap + to add one.
          </p>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-ink-300">
                  {group.label}
                </p>
                <motion.div
                  variants={listContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-2"
                >
                  {group.items.map((s) => (
                    <SessionItem key={s.id} session={s} onEdit={openEditSession} />
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heatmap */}
      {hasWindow && (
        <div className="mt-8">
          <h2 className="mb-3 font-sans text-base font-medium text-ink-900">
            Overview
          </h2>
          <div className="rounded-card bg-parchment-50 p-4 shadow-sm">
            <AttendanceHeatmap
              course={course}
              semesterStart={winStart!}
              semesterEnd={winEnd!}
              sessions={sessions ?? []}
              onSelectDate={(date, session) =>
                setSessionForm({ open: true, session: session ?? null, date })
              }
            />
          </div>
        </div>
      )}

      <Fab onClick={openNewSession} label="Add class" />

      <SessionForm
        open={sessionForm.open}
        onClose={() => setSessionForm({ open: false, session: null })}
        courseId={course.id}
        session={sessionForm.session}
        defaultDate={sessionForm.date}
      />

      <CourseForm
        open={editCourse}
        onClose={() => setEditCourse(false)}
        course={course}
        semesters={semesters ?? []}
        defaultSemesterId={course.semester_id}
        onDeleted={() => navigate('/dashboard', { replace: true })}
      />
    </div>
  );
}

function ProjectionCallout({
  proj,
  threshold,
}: {
  proj: TermProjection;
  threshold: number;
}) {
  const { remaining, canSkip, reachable, bestPct, worstPct } = proj;
  const left = `${remaining} class${remaining === 1 ? '' : 'es'} left this term.`;

  let tone: 'rose' | 'amber' | 'sage';
  let message: string;
  if (!reachable) {
    tone = 'rose';
    message = `${left} Even attending all of them you'd finish near ${bestPct}%, so ${threshold}% can't be reached now.`;
  } else if (canSkip === 0) {
    tone = 'amber';
    message = `${left} You'll need to attend every one to finish at ${threshold}%.`;
  } else {
    tone = 'sage';
    message = `${left} You can miss up to ${canSkip} and still finish above ${threshold}%.`;
  }

  return (
    <div className={`mt-4 rounded-card px-4 py-3 ${TONE_CLASSES[tone]}`}>
      <p className="font-sans text-sm font-medium">{message}</p>
      <p className="mt-1 font-sans text-xs opacity-80">
        Attend everything and you finish at {bestPct}%. Attend nothing more and you
        finish at {worstPct}%.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-serif text-xl leading-none text-ink-900">{value}</p>
      <p className="font-sans text-xs text-ink-500">{label}</p>
    </div>
  );
}

function ThresholdCallout({
  stats,
}: {
  stats: NonNullable<ReturnType<typeof useAttendanceStats>>;
}) {
  const { isAtRisk, percentage, threshold, canMissMore, needToAttend } = stats;
  const recover = Number.isFinite(needToAttend) ? needToAttend : null;

  let tone: 'rose' | 'amber' | 'sage';
  let message: string;

  if (isAtRisk) {
    tone = 'rose';
    message =
      recover !== null
        ? `You're below ${threshold}%. Attend ${recover} class${
            recover === 1 ? '' : 'es'
          } in a row to get back above it.`
        : `You're below ${threshold}%, and it can't get back to ${threshold}% this term.`;
  } else if (percentage < threshold + 5) {
    tone = 'amber';
    message = `You're close to the line. You can miss ${canMissMore} more before dropping below ${threshold}%.`;
  } else {
    tone = 'sage';
    message = `You're on track. You can miss ${canMissMore} more class${
      canMissMore === 1 ? '' : 'es'
    } and stay above ${threshold}%.`;
  }

  return (
    <div
      className={`mt-4 rounded-card px-4 py-3 font-sans text-sm font-medium ${TONE_CLASSES[tone]}`}
    >
      {message}
    </div>
  );
}
