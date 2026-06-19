import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Check, X, ChevronLeft } from 'lucide-react';
import { useAllCourses } from '../hooks/useCourses';
import { useAllSessions, useSessionMutations } from '../hooks/useSessions';
import { todayKey, formatSessionDate } from '../utils/dates';
import { hexToRgba } from '../lib/colors';
import { spring } from '../lib/motion';
import type { Course, ScheduleDay, Session, SessionStatus } from '../types';

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -280 : 280, opacity: 0 }),
};

export function QuickMarkPage() {
  const navigate = useNavigate();
  const { data: courses } = useAllCourses();
  const { data: allSessions } = useAllSessions();
  const { markSession } = useSessionMutations();

  const today = todayKey();
  const todayDow = new Date().getDay() as ScheduleDay;

  // Classes with any session already on today's date (an ad-hoc class added for
  // today, planned or marked). These belong in the deck even when today isn't
  // one of the class's recurring days.
  const courseIdsWithSessionToday = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSessions ?? []) {
      if (s.scheduled_date === today) set.add(s.course_id);
    }
    return set;
  }, [allSessions, today]);

  const scheduled = useMemo<Course[]>(
    () =>
      (courses ?? []).filter(
        (c) =>
          c.schedule_days.includes(todayDow) ||
          courseIdsWithSessionToday.has(c.id)
      ),
    [courses, todayDow, courseIdsWithSessionToday]
  );

  // Only decided sessions count as "marked"; a planned class today still needs
  // a real present/absent/cancelled, so it stays in the deck.
  const markedToday = useMemo(() => {
    const map = new Map<string, Session>();
    for (const s of allSessions ?? []) {
      if (s.scheduled_date === today && s.status !== 'planned') {
        map.set(s.course_id, s);
      }
    }
    return map;
  }, [allSessions, today]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const initialized = useRef(false);
  const justCompleted = useRef(false);

  // Start on the first class that hasn't been marked yet. If everything is
  // already marked, land straight on the "all done" screen — returning to this
  // tab should never offer to re-mark a finished day.
  useEffect(() => {
    if (initialized.current || courses === undefined || allSessions === undefined) {
      return;
    }
    initialized.current = true;
    const firstUnmarked = scheduled.findIndex((c) => !markedToday.has(c.id));
    setIndex(firstUnmarked === -1 ? scheduled.length : firstUnmarked);
  }, [courses, allSessions, scheduled, markedToday]);

  const done = scheduled.length > 0 && index >= scheduled.length;

  // Only bounce back to the dashboard when the day was finished in this visit.
  useEffect(() => {
    if (done && justCompleted.current) {
      const timer = setTimeout(() => navigate('/dashboard'), 1500);
      return () => clearTimeout(timer);
    }
  }, [done, navigate]);

  function paginate(dir: number) {
    setDirection(dir);
    setIndex((i) => Math.min(Math.max(i + dir, 0), scheduled.length - 1));
  }

  async function mark(course: Course, status: SessionStatus) {
    await markSession(course.id, today, status);
    setDirection(1);
    setIndex((i) => {
      const next = i + 1;
      if (next >= scheduled.length) justCompleted.current = true;
      return next;
    });
  }

  function handleDragEnd(_e: unknown, info: PanInfo) {
    if (info.offset.x < -80 && index < scheduled.length - 1) paginate(1);
    else if (info.offset.x > 80 && index > 0) paginate(-1);
  }

  // No classes today
  if (scheduled.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <p className="font-serif text-2xl text-ink-900">Nothing scheduled today</p>
        <p className="mt-2 font-sans text-sm text-ink-500">Enjoy the day off.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 font-sans text-sm font-medium text-sage-600"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-100">
          <Check size={40} className="text-sage-600" strokeWidth={2.5} />
        </div>
        <p className="mt-5 font-serif text-3xl text-ink-900">All done for today</p>
        <p className="mt-2 font-sans text-sm text-ink-500">
          Change any of these from the Calendar.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 font-sans text-sm font-medium text-sage-600"
        >
          Back to dashboard
        </button>
      </motion.div>
    );
  }

  const course = scheduled[index];
  const current = markedToday.get(course.id);

  return (
    <div className="relative flex min-h-[80vh] flex-col">
      <div className="flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="font-sans text-sm text-ink-500">
          {formatSessionDate(today)}
        </span>
        <span className="w-9" />
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={course.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            className="mx-auto w-full max-w-md rounded-sheet p-8 text-center"
            style={{ backgroundColor: hexToRgba(course.color, 0.08) }}
          >
            <p className="font-sans text-xs font-medium uppercase tracking-wide text-ink-300">
              Class {index + 1} of {scheduled.length}
            </p>
            <h2
              className="mt-3 font-serif text-3xl leading-tight"
              style={{ color: course.color }}
            >
              {course.name}
            </h2>

            {current && (
              <p className="mt-3 font-sans text-sm text-ink-500">
                Marked <span className="font-semibold">{current.status}</span>. Tap to
                change.
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4">
              <MarkButton
                label="Present"
                icon={<Check size={36} strokeWidth={2.5} />}
                className="bg-sage-500 text-white"
                active={current?.status === 'present'}
                onClick={() => mark(course, 'present')}
              />
              <MarkButton
                label="Absent"
                icon={<X size={36} strokeWidth={2.5} />}
                className="bg-rose-500 text-white"
                active={current?.status === 'absent'}
                onClick={() => mark(course, 'absent')}
              />
            </div>

            <button
              type="button"
              onClick={() => mark(course, 'cancelled')}
              className="mt-4 font-sans text-sm font-medium text-ink-500"
            >
              Class cancelled
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-4">
        {scheduled.map((c, i) => {
          const isMarked = markedToday.has(c.id);
          return (
            <span
              key={c.id}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? 'w-6 bg-sage-500'
                  : isMarked
                    ? 'w-2 bg-sage-400'
                    : 'w-2 bg-ink-100'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function MarkButton({
  label,
  icon,
  className,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  className: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-sheet font-sans text-lg font-semibold shadow-sm transition-opacity ${className} ${
        active ? 'ring-4 ring-ink-900/10' : ''
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}
