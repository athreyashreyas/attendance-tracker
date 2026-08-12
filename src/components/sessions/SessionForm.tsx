import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import {
  useSessionMutations,
  findSessionForDate,
  nextSlotForDate,
} from '../../hooks/useSessions';
import { STATUS_OPTIONS } from '../../lib/status';
import { ordinal, slotOf } from '../../lib/slots';
import { todayKey } from '../../utils/dates';
import type { Session, SessionStatus } from '../../types';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  session?: Session | null;
  defaultDate?: string;
  /**
   * Which class of the day this records. Given when a particular one was tapped
   * (the second lecture of a double, say). Left out, a new class takes the first
   * free place on the day.
   */
  slot?: number;
  /** Status a brand-new session starts on (default 'present'). */
  defaultStatus?: SessionStatus;
}

const MAX_NOTES = 200;

export function SessionForm({
  open,
  onClose,
  courseId,
  session,
  defaultDate,
  slot,
  defaultStatus = 'present',
}: SessionFormProps) {
  const { saveSession, deleteSession } = useSessionMutations();
  const isEdit = !!session;

  const [date, setDate] = useState('');
  const [status, setStatus] = useState<SessionStatus>('present');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Which class of the day a new one will be, so it can be said out loud. */
  const [newSlot, setNewSlot] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(session?.scheduled_date ?? defaultDate ?? todayKey());
    setStatus(session?.status ?? defaultStatus);
    setNotes(session?.notes ?? '');
    setConfirmDelete(false);
  }, [open, session, defaultDate, defaultStatus]);

  // A day can hold more than one class, so adding one to a day that already has
  // some says where it lands rather than quietly replacing what's there.
  useEffect(() => {
    if (!open || session || !date) {
      setNewSlot(null);
      return;
    }
    let live = true;
    void (async () => {
      const taken = slot
        ? await findSessionForDate(courseId, date, slot)
        : undefined;
      const next =
        slot && !taken ? slot : await nextSlotForDate(courseId, date);
      if (live) setNewSlot(next);
    })();
    return () => {
      live = false;
    };
  }, [open, session, courseId, date, slot]);

  async function handleSave() {
    setSaving(true);
    try {
      // Editing keeps the class it is unless it moves day. A new one takes the
      // class it was opened for, or the first free place on the day.
      let id = session?.id;
      let saveSlot: number;
      if (session) {
        // Moved to another day, it takes its place in that day rather than
        // carrying an ordinal that means nothing there.
        saveSlot =
          date === session.scheduled_date
            ? slotOf(session)
            : await nextSlotForDate(courseId, date);
      } else if (slot) {
        // The class that was tapped: record it, or edit it if it's since been
        // recorded elsewhere.
        const existing = await findSessionForDate(courseId, date, slot);
        if (existing) id = existing.id;
        saveSlot = slot;
      } else {
        saveSlot = await nextSlotForDate(courseId, date);
      }
      await saveSession({
        id,
        course_id: courseId,
        scheduled_date: date,
        slot: saveSlot,
        status,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    setSaving(true);
    try {
      await deleteSession(session.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit class' : 'Add class'}
    >
      <div className="space-y-6 pb-2">
        <div>
          <label className="mb-1.5 block font-sans text-xs font-medium text-ink-500">
            Date
          </label>
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
          {newSlot !== null && newSlot > 1 && (
            <p className="mt-1.5 font-sans text-xs text-ink-300">
              This will be the {ordinal(newSlot)} class of that day. The others
              keep their own marks.
            </p>
          )}
          {session && slotOf(session) > 1 && (
            <p className="mt-1.5 font-sans text-xs text-ink-300">
              The {ordinal(slotOf(session))} class of that day.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 font-sans text-xs font-medium text-ink-500">Status</p>
          <div className="grid grid-cols-2 gap-2.5">
            {STATUS_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = status === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3.5 font-sans text-sm font-medium transition-colors ${
                    selected ? opt.active : 'bg-parchment-200 text-ink-500'
                  }`}
                >
                  <Icon size={20} strokeWidth={selected ? 2.5 : 2} />
                  {opt.label}
                </motion.button>
              );
            })}
          </div>
          <p className="mt-2 font-sans text-xs text-ink-300">
            Choose &ldquo;Not yet&rdquo; to add the class now and mark it on the day.
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-sans text-xs font-medium text-ink-500">
              Notes
            </label>
            <span className="font-sans text-xs text-ink-300">
              {notes.length}/{MAX_NOTES}
            </span>
          </div>
          <textarea
            value={notes}
            maxLength={MAX_NOTES}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="w-full resize-none rounded-lg border-0 bg-parchment-50 px-3.5 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 placeholder:text-ink-300 focus:ring-2 focus:ring-inset focus:ring-sage-400"
          />
        </div>

        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
            {isEdit ? 'Save changes' : 'Add class'}
          </Button>

          {isEdit &&
            (confirmDelete ? (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="text-rose-600"
              >
                <Trash2 size={16} />
                Delete class
              </Button>
            ))}
        </div>
      </div>
    </BottomSheet>
  );
}
