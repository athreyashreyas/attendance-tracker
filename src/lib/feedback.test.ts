import { describe, expect, it } from 'vitest';
import {
  MAX_FEEDBACK_LENGTH,
  composeFeedback,
  describeDevice,
  feedbackError,
  type FeedbackContext,
} from './feedback';

const ctx: FeedbackContext = {
  version: '0.9.0',
  account: 'reader@example.com',
  device: 'iPhone, installed to the home screen',
  sentAt: '16 August 2026 at 21:40',
};

describe('composeFeedback', () => {
  it("names the version and the kind in the subject, so the creator's inbox sorts itself", () => {
    expect(composeFeedback('bug', 'The ring is stuck.', ctx).subject).toBe(
      'Attend 0.9.0 · Bug report'
    );
    expect(composeFeedback('idea', 'Widgets, please.', ctx).subject).toBe(
      'Attend 0.9.0 · Feature idea'
    );
  });

  it('leads with their words, untouched, and puts the details underneath', () => {
    const { body } = composeFeedback('bug', 'The ring is stuck.', ctx);
    expect(body.startsWith('The ring is stuck.\n\n---\n')).toBe(true);
    expect(body).toContain('Attend 0.9.0');
    expect(body).toContain('iPhone, installed to the home screen');
    expect(body).toContain('Sent 16 August 2026 at 21:40');
    expect(body).toContain('From reader@example.com');
  });

  it('keeps the shape of what they wrote but trims the edges', () => {
    const { body } = composeFeedback('bug', '\n\n  Line one\nLine two  \n', ctx);
    expect(body.startsWith('Line one\nLine two\n\n---')).toBe(true);
  });

  it('says so plainly when there is no account, and promises no reply', () => {
    const { body } = composeFeedback('idea', 'Hello.', { ...ctx, account: null });
    expect(body).toContain('Not signed in');
    expect(body).not.toContain('Replying to this email');
  });

  it('flags the reply route only when there is somewhere to reply to', () => {
    const { body } = composeFeedback('idea', 'Hello.', ctx);
    expect(body).toContain('Replying to this email reaches them.');
  });
});

describe('feedbackError', () => {
  it('asks for words when there are none, whitespace included', () => {
    expect(feedbackError('')).not.toBeNull();
    expect(feedbackError('   \n  ')).not.toBeNull();
  });

  it('asks for a few more when there is barely anything', () => {
    expect(feedbackError('hi')).not.toBeNull();
  });

  it('lets an ordinary message through', () => {
    expect(feedbackError('The ring is stuck.')).toBeNull();
  });

  it('measures the trimmed message, so trailing blank lines never block a send', () => {
    const full = 'a'.repeat(MAX_FEEDBACK_LENGTH);
    expect(feedbackError(full)).toBeNull();
    expect(feedbackError(`${full}\n\n   `)).toBeNull();
    expect(feedbackError(`${full}a`)).not.toBeNull();
  });
});

describe('describeDevice', () => {
  it('names the thing in the hand, and whether Attend was installed', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(describeDevice(iphone, true)).toBe(
      'iPhone, installed to the home screen'
    );
    expect(describeDevice(iphone, false)).toBe('iPhone, in the browser');
  });

  it('tells an iPad from a Mac, which share most of a user-agent string', () => {
    expect(
      describeDevice('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', false)
    ).toBe('iPad, in the browser');
    expect(
      describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', false)
    ).toBe('Mac, in the browser');
  });

  it('would rather admit it does not know than guess wrong', () => {
    expect(describeDevice('something-else/1.0', false)).toBe(
      'an unrecognised device, in the browser'
    );
  });
});
