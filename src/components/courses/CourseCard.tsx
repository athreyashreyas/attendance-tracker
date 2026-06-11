import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ProgressRing } from '../ui/ProgressRing';
import { Badge } from '../ui/Badge';
import { useAttendanceStats } from '../../hooks/useAttendanceStats';
import { listItem } from '../../lib/motion';
import type { Course } from '../../types';

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
}

export function CourseCard({ course, onEdit }: CourseCardProps) {
  const navigate = useNavigate();
  const stats = useAttendanceStats(course);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function startPress() {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onEdit(course);
    }, 200);
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
  const canMiss = stats && Number.isFinite(stats.canMissMore) ? stats.canMissMore : 0;

  return (
    <motion.div
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
          {!hasSessions && (
            <span className="font-sans text-xs text-ink-300">
              No classes recorded yet
            </span>
          )}
          {hasSessions && stats!.isAtRisk && (
            <Badge tone="rose" icon={<AlertTriangle size={12} />}>
              Below {stats!.threshold}%
            </Badge>
          )}
          {hasSessions && !stats!.isAtRisk && canMiss > 0 && (
            <Badge tone="neutral">Can miss {canMiss} more</Badge>
          )}
          {hasSessions && stats!.needToAttend > 0 && Number.isFinite(stats!.needToAttend) && (
            <Badge tone="amber">Attend {stats!.needToAttend} more to recover</Badge>
          )}
        </div>
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
