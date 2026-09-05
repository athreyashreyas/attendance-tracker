import { useMemo, useState } from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { moveBy } from '../../lib/order';
import type { Course, Semester } from '../../types';

interface CourseArrangerProps {
  /** The classes on screen, in their current order. */
  courses: Course[];
  semesterOf: (course: Course) => Semester | null;
  /** Called when the order settles, with the ids in their new order. */
  onReorder: (orderedIds: string[]) => void;
}

/**
 * Arranging the classes on the home screen.
 *
 * Three decisions worth keeping:
 *
 *  - **Only the handle drags.** A card is dragged by its grip, never by its
 *    body, so a list longer than the screen still scrolls under the thumb.
 *    It is the same bargain the bottom sheet makes with its own handle.
 *  - **One column, whatever the screen.** The cards are a grid at md and up,
 *    and a grid cannot be dragged along one axis without lying about where a
 *    card will land. Arranging is a list, which also makes the mode legible at
 *    a glance: this screen is different, and it is different on purpose.
 *  - **A tap does the same job as a drag.** The chevrons are not a fallback
 *    nobody uses. They are how this works with a keyboard, with a screen
 *    reader, and with one hand on a train.
 */
export function CourseArranger({
  courses,
  semesterOf,
  onReorder,
}: CourseArrangerProps) {
  // The order lives here while it is being moved around, so a drag is smooth
  // and only the settled order is written.
  const [ids, setIds] = useState<string[]>(() => courses.map((c) => c.id));

  const byId = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) map.set(c.id, c);
    return map;
  }, [courses]);

  // A class added or removed elsewhere (a sync landing mid-arrange) is taken
  // as it comes: keep the order being worked on, drop what has gone, and put
  // anything new on the end.
  const live = useMemo(() => {
    const kept = ids.filter((id) => byId.has(id));
    const added = courses.map((c) => c.id).filter((id) => !kept.includes(id));
    return [...kept, ...added];
  }, [ids, byId, courses]);

  function commit(next: string[]) {
    setIds(next);
    onReorder(next);
  }

  return (
    <Reorder.Group
      axis="y"
      values={live}
      onReorder={setIds}
      className="mx-auto max-w-xl space-y-2"
    >
      {live.map((id, i) => {
        const course = byId.get(id);
        if (!course) return null;
        const semester = semesterOf(course);
        return (
          <ArrangeRow
            key={id}
            id={id}
            course={course}
            place={i + 1}
            total={live.length}
            semesterName={semester?.name ?? null}
            onMove={(delta) => commit(moveBy(live, id, delta))}
            onSettle={() => onReorder(live)}
          />
        );
      })}
    </Reorder.Group>
  );
}

interface ArrangeRowProps {
  id: string;
  course: Course;
  place: number;
  total: number;
  semesterName: string | null;
  onMove: (delta: number) => void;
  onSettle: () => void;
}

function ArrangeRow({
  id,
  course,
  place,
  total,
  semesterName,
  onMove,
  onSettle,
}: ArrangeRowProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onSettle}
      // Lifted off the page while it is in the air, and settled back down the
      // moment it lands, so the card being moved is never in doubt.
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 28px rgba(26, 26, 24, 0.14)',
        cursor: 'grabbing',
      }}
      className="flex items-center gap-3 rounded-card bg-parchment-50 p-3 pr-2 shadow-sm"
    >
      <span
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: course.color }}
      />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-medium text-ink-900">
          {course.name}
        </span>
        <span className="block truncate font-sans text-xs text-ink-300">
          {semesterName ?? 'No semester'} · {place} of {total}
        </span>
      </span>

      <span className="flex shrink-0 flex-col">
        <StepButton
          label={`Move ${course.name} up`}
          disabled={place === 1}
          onClick={() => onMove(-1)}
        >
          <ChevronUp size={15} />
        </StepButton>
        <StepButton
          label={`Move ${course.name} down`}
          disabled={place === total}
          onClick={() => onMove(1)}
        >
          <ChevronDown size={15} />
        </StepButton>
      </span>

      {/* The only part that drags, so the page still scrolls everywhere else. */}
      <span
        onPointerDown={(e) => controls.start(e)}
        aria-hidden="true"
        className="flex h-10 w-8 cursor-grab touch-none items-center justify-center text-ink-300 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </span>
    </Reorder.Item>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.86 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-6 w-7 items-center justify-center rounded-md text-ink-500 disabled:opacity-25"
    >
      {children}
    </motion.button>
  );
}
