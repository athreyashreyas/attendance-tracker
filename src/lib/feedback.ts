/**
 * Writing to the person who makes Attend.
 *
 * A message is composed here and handed to the outbox, which sends it now or
 * keeps it until there is a connection. This file only decides what the message
 * says; feedbackOutbox.ts decides when it travels.
 *
 * Replies go back to the address on the sender's account. The relay sets it as
 * the mail's reply-to, taken from their session rather than from anything the
 * app sends up, so answering the email answers the person who wrote it.
 *
 * Everything in this file is pure on purpose: it is the part worth testing, and
 * it must not drag the Supabase client into the test run.
 */

export type FeedbackKind = 'bug' | 'idea';

/** Past this it stops being a report and starts being a document. */
export const MAX_FEEDBACK_LENGTH = 4000;

/** Below this a message rarely says enough to act on, so the sheet nudges. */
const MIN_FEEDBACK_LENGTH = 4;

interface KindCopy {
  /** The tab, and the word used for it everywhere in the sheet. */
  label: string;
  /** How it reads in the creator's inbox. */
  subject: string;
  prompt: string;
  placeholder: string;
}

export const FEEDBACK_KINDS: Record<FeedbackKind, KindCopy> = {
  bug: {
    label: 'Something is broken',
    subject: 'Bug report',
    prompt:
      'What went wrong, and what were you doing just before it did? The more detail you give, the easier it is to fix.',
    placeholder:
      'I marked the second class of a double as absent and the ring did not move...',
  },
  idea: {
    label: 'An idea',
    subject: 'Feature idea',
    prompt:
      'What would you like Attend to do? It does not have to be a finished idea. A fair amount of what is here now started as somebody asking for it.',
    placeholder: 'It would help if I could...',
  },
};

export interface FeedbackContext {
  version: string;
  /** The account's address, which is where any reply will land. */
  account: string | null;
  /** Plain words for what the app is running on. */
  device: string;
  /** The sender's own local time, which is the time they will remember. */
  sentAt: string;
}

export interface ComposedFeedback {
  subject: string;
  body: string;
}

/**
 * The message as it arrives in the creator's inbox: their words on top, and
 * the details underneath that they should never have to type out themselves.
 */
export function composeFeedback(
  kind: FeedbackKind,
  message: string,
  ctx: FeedbackContext
): ComposedFeedback {
  const footer = [
    `Attend ${ctx.version}`,
    ctx.device,
    `Sent ${ctx.sentAt}`,
    ctx.account ? `From ${ctx.account}` : 'Not signed in',
  ];
  // A nudge for the creator, since a reply-to is easy to miss in a mail client.
  if (ctx.account) footer.push('Replying to this email reaches them.');

  return {
    subject: `Attend ${ctx.version} · ${FEEDBACK_KINDS[kind].subject}`,
    body: `${message.trim()}\n\n---\n${footer.join('\n')}\n`,
  };
}

/**
 * The complaint to show under the box, or null when it is ready to send.
 * Worded as an invitation rather than a telling-off.
 */
export function feedbackError(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) return 'Write a line or two first.';
  if (trimmed.length < MIN_FEEDBACK_LENGTH)
    return 'A few more words and they will know what you mean.';
  if (trimmed.length > MAX_FEEDBACK_LENGTH)
    return `This is longer than the box can carry. Trim it to about ${MAX_FEEDBACK_LENGTH} characters and send the rest separately.`;
  return null;
}

/**
 * What the app is running on, in words rather than a user-agent string. Enough
 * to reproduce a bug on the right thing, and nothing that identifies anyone.
 */
export function describeDevice(userAgent: string, installed: boolean): string {
  const platform = /iPhone/i.test(userAgent)
    ? 'iPhone'
    : /iPad/i.test(userAgent)
      ? 'iPad'
      : /Android/i.test(userAgent)
        ? 'Android'
        : /Macintosh|Mac OS X/i.test(userAgent)
          ? 'Mac'
          : /Windows/i.test(userAgent)
            ? 'Windows'
            : /Linux/i.test(userAgent)
              ? 'Linux'
              : 'an unrecognised device';
  return `${platform}, ${installed ? 'installed to the home screen' : 'in the browser'}`;
}
