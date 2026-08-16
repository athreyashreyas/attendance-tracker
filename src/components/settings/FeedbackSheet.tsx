import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Lightbulb, Check, CloudOff, Send } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { spring } from '../../lib/motion';
import { useSendFeedback } from '../../hooks/useSendFeedback';
import {
  FEEDBACK_KINDS,
  MAX_FEEDBACK_LENGTH,
  feedbackError,
  type FeedbackKind,
} from '../../lib/feedback';

interface FeedbackSheetProps {
  /** The kind to open on, or null when the sheet is closed. */
  kind: FeedbackKind | null;
  onClose: () => void;
}

/** The counter stays out of sight until the end is actually in view. */
const COUNTER_FROM = Math.round(MAX_FEEDBACK_LENGTH * 0.8);

/**
 * Writing to the creator, from Settings.
 *
 * The sheet is built around one promise it has to keep: that a message
 * genuinely goes somewhere. So it has two endings and neither is a shrug. It
 * went, or it is saved and will go on its own. Both say plainly what happened
 * and what comes next.
 */
export function FeedbackSheet({ kind, onClose }: FeedbackSheetProps) {
  const open = kind !== null;
  const { state, account, send, reset } = useSendFeedback();

  const [active, setActive] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Every opening starts clean, on whichever kind was tapped in Settings.
  useEffect(() => {
    if (!kind) return;
    setActive(kind);
    setMessage('');
    setError(null);
    reset();
  }, [kind, reset]);

  const copy = FEEDBACK_KINDS[active];
  const sending = state === 'sending';

  async function handleSend() {
    const problem = feedbackError(message);
    setError(problem);
    if (problem) return;
    await send(active, message);
  }

  function chooseKind(next: FeedbackKind) {
    setActive(next);
    setError(null);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Make Attend yours">
      {state === 'sent' || state === 'queued' ? (
        <Delivered queued={state === 'queued'} account={account} onClose={onClose} />
      ) : (
        <div className="space-y-4 pb-2">
          <div className="flex gap-1.5 rounded-lg bg-parchment-200 p-1">
            <KindTab
              active={active === 'bug'}
              onClick={() => chooseKind('bug')}
              icon={<Bug size={14} />}
              label={FEEDBACK_KINDS.bug.label}
            />
            <KindTab
              active={active === 'idea'}
              onClick={() => chooseKind('idea')}
              icon={<Lightbulb size={14} />}
              label={FEEDBACK_KINDS.idea.label}
            />
          </div>

          <p className="font-sans text-sm text-ink-500">{copy.prompt}</p>

          <div>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              maxLength={MAX_FEEDBACK_LENGTH + 200}
              placeholder={copy.placeholder}
              aria-label={copy.label}
              className="scroll-ios w-full resize-none rounded-lg border-0 bg-parchment-50 px-3.5 py-2.5 font-sans text-sm leading-relaxed text-ink-900 ring-1 ring-inset ring-ink-100 transition-shadow placeholder:text-ink-300 focus:ring-2 focus:ring-inset focus:ring-sage-400"
            />
            {message.length > COUNTER_FROM && (
              <p className="mt-1.5 text-right font-sans text-xs tabular-nums text-ink-300">
                {MAX_FEEDBACK_LENGTH - message.trim().length} left
              </p>
            )}
          </div>

          <p className="font-sans text-xs text-ink-500">
            Your message will be personally attended to and version updates based on your feedback will auto sync on all the devices you use Attend on.
            {account ? ` Any reply will come directly to ${account}.` : ''}
          </p>

          {/* A line is always held here, so an error arriving never shoves the
              button out from under a thumb already on its way to it. */}
          <p className="min-h-5 font-sans text-sm text-rose-600">{error}</p>

          <Button fullWidth size="lg" onClick={handleSend} disabled={sending}>
            <Send size={16} />
            {sending ? 'Sending' : 'Send it over'}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

/**
 * The moment the promise is kept, either way it went. "Thanks for your
 * feedback!" tells somebody nothing, so this says where the message is, who
 * reads it, and what happens next.
 */
function Delivered({
  queued,
  account,
  onClose,
}: {
  queued: boolean;
  account: string | null;
  onClose: () => void;
}) {
  return (
    <div className="pb-2">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
          queued ? 'bg-parchment-200' : 'bg-sage-500'
        }`}
      >
        {queued ? (
          <CloudOff size={24} className="text-ink-500" />
        ) : (
          <Check size={26} strokeWidth={2.5} className="text-white" />
        )}
      </motion.div>

      <p className="text-center font-serif text-xl text-ink-900">
        {queued ? 'Saved, and it will send itself.' : 'That is with them now.'}
      </p>

      <div className="mx-auto mt-3 max-w-sm space-y-2.5 text-center font-sans text-sm text-ink-500">
        {queued ? (
          <p>
            It could not go just now, so it is sitting on your device. Attend
            sends it the next time it gets a connection, whether or not you open
            the app again.
          </p>
        ) : (
          <p>
            It arrived with your version and device attached, so they can see the
            same screen you were looking at.
          </p>
        )}
        <p>
          Attend is built and maintained by one person. They read what comes in,
          and they write back when there is something worth saying. A fair
          amount of what is in the app now started as somebody&apos;s message.
        </p>
        {account && (
          <p>
            Any reply will come to{' '}
            <span className="selectable font-medium text-ink-700">{account}</span>.
          </p>
        )}
        <p className="text-ink-300">Thank you for taking the time.</p>
      </div>

      <Button fullWidth size="lg" variant="secondary" className="mt-5" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-sans text-xs font-medium transition-colors ${
        active ? 'bg-parchment-50 text-ink-900 shadow-sm' : 'text-ink-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
