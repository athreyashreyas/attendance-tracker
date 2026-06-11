import { motion } from 'framer-motion';
import { formatSessionDate } from '../../utils/dates';
import { listItem } from '../../lib/motion';
import type { Session, SessionStatus } from '../../types';

interface SessionItemProps {
  session: Session;
  onEdit: (session: Session) => void;
}

const STATUS_STYLE: Record<SessionStatus, { label: string; className: string }> = {
  present: { label: 'Present', className: 'bg-sage-500 text-white' },
  absent: { label: 'Absent', className: 'bg-rose-500 text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-parchment-300 text-ink-500' },
};

export function SessionItem({ session, onEdit }: SessionItemProps) {
  const style = STATUS_STYLE[session.status];

  return (
    <motion.button
      type="button"
      variants={listItem}
      whileTap={{ scale: 0.98 }}
      onClick={() => onEdit(session)}
      className="flex w-full items-center gap-3 rounded-card bg-parchment-50 p-3.5 text-left shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-medium text-ink-900">
          {formatSessionDate(session.scheduled_date)}
        </p>
        {session.notes && (
          <p className="truncate font-sans text-xs text-ink-500">
            {session.notes}
          </p>
        )}
      </div>
      <motion.span
        key={session.status}
        initial={{ scale: 0.9 }}
        animate={{ scale: [0.9, 1.1, 1] }}
        transition={{ duration: 0.25 }}
        className={`shrink-0 rounded-full px-2.5 py-1 font-sans text-xs font-medium ${style.className}`}
      >
        {style.label}
      </motion.span>
    </motion.button>
  );
}
