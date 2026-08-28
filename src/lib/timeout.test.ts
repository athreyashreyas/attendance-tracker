import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TimeoutError,
  fetchWithTimeout,
  isTimeoutError,
  settleWithin,
  withTimeout,
} from './timeout';

/** A promise that never settles: what a hung server actually gives you. */
function hangs<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

/** Rejects after a tick, the way a server that refuses the request does. */
function rejectsAfter(ms: number, error: Error): Promise<never> {
  return new Promise<never>((_resolve, reject) => setTimeout(() => reject(error), ms));
}

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('rejects once the time is up, so a hung request cannot block a caller forever', async () => {
    const result = withTimeout(hangs(), 5_000);
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });

  it('passes a value through untouched when the work finishes in time', async () => {
    const result = withTimeout(Promise.resolve('session'), 5_000);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('session');
  });

  it('preserves the original rejection rather than masking it as a timeout', async () => {
    const boom = new Error('invalid login credentials');
    const result = withTimeout(rejectsAfter(10, boom), 5_000);
    const assertion = expect(result).rejects.toBe(boom);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });
});

describe('settleWithin', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('falls back when the work hangs, so the app still reaches a definite state', async () => {
    const result = settleWithin(hangs<string>(), 5_000, 'fallback');
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toBe('fallback');
  });

  it('falls back on rejection too', async () => {
    const result = settleWithin(rejectsAfter(10, new Error('nope')), 5_000, 'fallback');
    await vi.advanceTimersByTimeAsync(10);
    await expect(result).resolves.toBe('fallback');
  });
});

describe('isTimeoutError', () => {
  it('recognises our own timeout', () => {
    expect(isTimeoutError(new TimeoutError())).toBe(true);
  });

  it('recognises an aborted fetch, which is how the request layer reports one', () => {
    expect(isTimeoutError({ name: 'AbortError' })).toBe(true);
  });

  it('leaves a real error alone, so a wrong password is never called a timeout', () => {
    expect(isTimeoutError(new Error('Invalid login credentials'))).toBe(false);
  });
});

describe('fetchWithTimeout', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('aborts a request that never answers', async () => {
    // A fetch that only ever settles by being aborted: the hung-server case.
    vi.stubGlobal('fetch', (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        );
      })
    );

    await expect(
      fetchWithTimeout(20)('https://example.invalid')
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('leaves a responsive request alone', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('ok')));
    const response = await fetchWithTimeout(1_000)('https://example.invalid');
    await expect(response.text()).resolves.toBe('ok');
  });

  it("honours a caller's own abort signal", async () => {
    vi.stubGlobal('fetch', (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        );
      })
    );

    const controller = new AbortController();
    const pending = fetchWithTimeout(60_000)('https://example.invalid', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
