import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { APP_VERSION } from '../lib/changelog';
import { composeFeedback, describeDevice, type FeedbackKind } from '../lib/feedback';
import { sendOrQueueFeedback } from '../lib/feedbackOutbox';
import { useAuth } from './useAuth';

/**
 * idle -> sending -> sent, or -> queued when it could not go right away.
 *
 * 'queued' is not a failure and is not shown as one. The message is on the
 * device and will be sent the moment there is a connection, which is the same
 * promise Attend already makes about everything else somebody writes into it.
 */
export type SendState = 'idle' | 'sending' | 'sent' | 'queued';

/** True when the app is running from the home screen rather than a browser tab. */
function isInstalled(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/**
 * Sends a message to the person who makes Attend, or keeps it safe until it
 * can be sent. Nothing written here can be lost: the only two endings are that
 * it went, or that it is waiting on the device to go.
 */
export function useSendFeedback() {
  const { user } = useAuth();
  const [state, setState] = useState<SendState>('idle');

  const account = user?.email ?? null;

  const send = useCallback(
    async (kind: FeedbackKind, message: string) => {
      const mail = composeFeedback(kind, message, {
        version: APP_VERSION,
        account,
        device: describeDevice(navigator.userAgent, isInstalled()),
        sentAt: format(new Date(), "d MMMM yyyy 'at' HH:mm"),
      });

      setState('sending');
      const outcome = await sendOrQueueFeedback(kind, mail.subject, mail.body);
      setState(outcome);
    },
    [account]
  );

  const reset = useCallback(() => setState('idle'), []);

  return { state, account, send, reset };
}
