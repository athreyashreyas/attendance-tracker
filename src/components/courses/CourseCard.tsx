import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ProgressRing } from '../ui/ProgressRing';
import { ProgressTicks } from '../ui/ProgressTicks';
import { Badge } from '../ui/Badge';
import { useAttendanceStats, useTermProjection } from '../../hooks/useAttendanceStats';
import { listItem } from '../../lib/motion';
import type { Course, Semester } from '../../types';

interface CourseCardProps {
  course: Course;
  semester: Semester | null;
  onEdit: (course: Course) => void;
}

export function CourseCard({ course, semester, onEdit }: CourseCardProps) {
  const navigate = useNavigate();
  const stats = useAttendanceStats(course);
  const proj = useTermProjection(course, semester);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function startPress() {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit(course);
    }, 500);
  }
  function endPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  function handleClick() {
    if (!didLongPress.current) navigate(`/courses/${course.id}`);
  }

  const hasSessions = stats !== null && stats.total > 0;

  // How far through the class's own term we are: classes already settled out of
  // every class that counts. Only meaningful when the term has an end to
  // measure against, so open-ended classes simply go without.
  const termTotal = proj?.projectedTotal ?? 0;
  const termDone = proj ? proj.projectedTotal - proj.remaining : 0;
  const showTerm = proj !== null && termTotal > 0;

  return (
    <motion.div
      layout
      variants={listItem}
      whileTap={{ scale: 0.98 }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onClick={handleClick}
      className="flex cursor-pointer items-center gap-4 overflow-hidden rounded-card bg-parchment-50 p-4 shadow-sm"
    >
      <span
        className="h-14 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: course.color }}
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-sans text-base font-medium text-ink-900">
          {course.name}
        </h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <CourseBadge
            hasSessions={hasSessions}
            isAtRisk={stats?.isAtRisk ?? false}
            threshold={course.min_attendance_pct}
            remaining={proj?.remaining ?? 0}
            canSkip={proj?.canSkip ?? 0}
            reachable={proj?.reachable ?? true}
          />
        </div>
        {showTerm && (
          <ProgressTicks
            className="mt-2"
            done={termDone}
            total={termTotal}
            color={course.color}
            label={termProgressLabel(termDone, termTotal)}
          />
        )}
      </div>

      <ProgressRing
        value={stats?.percentage ?? 0}
        threshold={course.min_attendance_pct}
        size={64}
        strokeWidth={6}
        color={hasSessions ? undefined : '#D4D2CB'}
      >
        <span className="font-sans text-sm font-semibold text-ink-900">
          {hasSessions ? `${Math.round(stats!.percentage)}%` : ''}
        </span>
      </ProgressRing>
    </motion.div>
  );
}

/** Warm, countable phrasing for how far along the term is. */
function termProgressLabel(done: number, total: number): string {
  if (done === 0) return total === 1 ? 'One class ahead' : `${total} classes ahead`;
  if (done >= total) {
    return total === 1 ? 'The one class is done' : `All ${total} classes done`;
  }
  return `${done} of ${total} classes done`;
}

function CourseBadge({
  hasSessions,
  isAtRisk,
  threshold,
  remaining,
  canSkip,
  reachable,
}: {
  hasSessions: boolean;
  isAtRisk: boolean;
  threshold: number;
  remaining: number;
  canSkip: number;
  reachable: boolean;
}) {
  if (!hasSessions && remaining === 0) {
    return (
      <span className="font-sans text-xs text-ink-300">
        No classes recorded yet
      </span>
    );
  }

  if (remaining > 0) {
    if (!reachable) {
      return (
        <Badge tone="rose" icon={<AlertTriangle size={12} />}>
          Can&apos;t reach {threshold}%
        </Badge>
      );
    }
    if (canSkip === 0) {
      return (
        <Badge tone="amber">
          Attend all {remaining} left
        </Badge>
      );
    }
    return (
      <Badge tone="green">
        Can miss {canSkip} of {remaining} left
      </Badge>
    );
  }

  // Nothing scheduled ahead (term over, or an open-ended class): show standing.
  if (isAtRisk) {
    return (
      <Badge tone="rose" icon={<AlertTriangle size={12} />}>
        Below {threshold}%
      </Badge>
    );
  }
  return <Badge tone="green">Above {threshold}%</Badge>;
}
