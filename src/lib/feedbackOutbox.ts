import { db } from './db';
import { supabase } from './supabase';
import { nowIso } from '../utils/dates';
import type { FeedbackKind } from './feedback';
import type { FeedbackOutboxItem } from '../types';

/**
 * Messages waiting to reach the creator.
 *
 * Attend is local-first everywhere else, and a message written in Settings is
 * treated the same way: it is written to the device first and delivered when
 * there is a connection. Somebody on a train can write what went wrong, close
 * the app, and never think about it again.
 *
 * This is deliberately its own small queue rather than a row in sync_queue,
 * which is shaped around tables and record ids and would have to be bent out of
 * shape to carry a message that belongs to no table.
 */

/** Attempts before a message is given up on, so a queue cannot grow forever. */
const MAX_ATTEMPTS = 8;

let flushing = false;

/** Hands one message to the relay. Throws when it did not get through. */
async function relay(item: FeedbackOutboxItem): Promise<void> {
  const { error } = await supabase.functions.invoke('feedback', {
    body: { kind: item.kind, subject: item.subject, body: item.body },
  });
  if (error) throw error;
}

/**
 * Tries to send now, and keeps the message if it cannot. Returns how it went,
 * so the sheet can tell the truth about which of the two happened.
 */
export async function sendOrQueueFeedback(
  kind: FeedbackKind,
  subject: string,
  body: string
): Promise<'sent' | 'queued'> {
  const item: FeedbackOutboxItem = {
    kind,
    subject,
    body,
    created_at: nowIso(),
    attempts: 0,
  };

  if (navigator.onLine) {
    try {
      await relay(item);
      return 'sent';
    } catch {
      // Fall through: it is worth keeping rather than worth losing.
    }
  }

  await db.feedback_outbox.add({ ...item, attempts: 1 });
  return 'queued';
}

/** How many messages are still waiting. */
export async function pendingFeedbackCount(): Promise<number> {
  return db.feedback_outbox.count();
}

/**
 * Sends everything waiting, oldest first. Safe to call often: it does nothing
 * offline, nothing while signed out, and never runs twice at once.
 */
export async function flushFeedbackOutbox(): Promise<void> {
  if (flushing || !navigator.onLine) return;

  // The relay stamps the sender from their session, so there is nobody to
  // attribute a message to until somebody is signed in.
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  flushing = true;
  try {
    const waiting = await db.feedback_outbox.orderBy('created_at').toArray();
    for (const item of waiting) {
      try {
        await relay(item);
        await db.feedback_outbox.delete(item.id!);
      } catch {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          console.warn('Giving up on a queued message after', attempts, 'tries.');
          await db.feedback_outbox.delete(item.id!);
        } else {
          await db.feedback_outbox.update(item.id!, { attempts });
        }
        // One failure usually means the next will fail too, so stop here and
        // let the next reconnect try again rather than burning the attempts.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Watches for a chance to send. Coming back online is the obvious one; coming
 * back to the app covers the case where the connection returned while it was
 * closed and no event was ever heard.
 */
export function startFeedbackOutbox(): () => void {
  const attempt = () => void flushFeedbackOutbox();
  const onVisible = () => {
    if (document.visibilityState === 'visible') attempt();
  };

  window.addEventListener('online', attempt);
  document.addEventListener('visibilitychange', onVisible);
  attempt();

  return () => {
    window.removeEventListener('online', attempt);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
