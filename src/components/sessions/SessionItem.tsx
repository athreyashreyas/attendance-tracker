import { motion } from 'framer-motion';
import { formatSessionDate } from '../../utils/dates';
import { STATUS_LABEL } from '../../lib/status';
import { ordinal, slotOf } from '../../lib/slots';
import { listItem } from '../../lib/motion';
import type { Session, SessionStatus } from '../../types';

interface SessionItemProps {
  session: Session;
  onEdit: (session: Session) => void;
}

const STATUS_CLASS: Record<SessionStatus, string> = {
  present: 'bg-sage-500 text-white',
  absent: 'bg-rose-500 text-white',
  cancelled: 'bg-parchment-300 text-ink-500',
  planned: 'bg-parchment-200 text-ink-500',
};

export function SessionItem({ session, onEdit }: SessionItemProps) {
  // Days that hold more than one class list them separately, so each says
  // which one it is rather than repeating the date twice over.
  const slot = slotOf(session);

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
          {slot > 1 && (
            <span className="font-normal text-ink-300">
              {' '}
              · {ordinal(slot)} class
            </span>
          )}
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
        className={`shrink-0 rounded-full px-2.5 py-1 font-sans text-xs font-medium ${STATUS_CLASS[session.status]}`}
      >
        {STATUS_LABEL[session.status]}
      </motion.span>
    </motion.button>
  );
}
