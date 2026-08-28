/**
 * Bounds on network work, so a server that accepts a connection and then never
 * answers cannot strand the app.
 *
 * This is the failure the Supabase incident of 27 Aug 2026 exposed: auth stayed
 * reachable but stopped responding, so every request hung open instead of
 * failing. A genuinely offline device was always fine (fetch rejects at once);
 * a hung server was not, because nothing ever rejected and every `await` sat
 * there forever.
 */

/** Thrown when a bounded operation runs out of time. */
export const TIMEOUT_MESSAGE = 'The server took too long to respond.';

export class TimeoutError extends Error {
  constructor(message = TIMEOUT_MESSAGE) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (typeof error !== 'object' || error === null) return false;

  // An aborted fetch surfaces as a DOMException named AbortError; the timeout
  // reason we pass to abort() rides along on some engines but not all, so the
  // name is the reliable signal.
  if ('name' in error && (error as { name: unknown }).name === 'AbortError') return true;

  // auth-js does not rethrow: it catches the abort and hands the message back
  // on the result's `error`, so an auth timeout arrives as an ordinary error
  // object carrying our own text. Verified against a hung server.
  return (
    'message' in error && (error as { message: unknown }).message === TIMEOUT_MESSAGE
  );
}

/**
 * Reject with a TimeoutError if `promise` has not settled within `ms`.
 *
 * The underlying work is not cancelled — it is only stopped from blocking the
 * caller. Use for operations whose result the UI is waiting on.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Resolve to `fallback` if `promise` has not settled within `ms`. Rejections
 * resolve to `fallback` too, so the caller always gets a usable value.
 *
 * Use where the app must reach a definite state no matter what the server does.
 */
export function settleWithin<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: T
): Promise<T> {
  return withTimeout(promise, ms).catch(() => fallback);
}

/**
 * A `fetch` that aborts after `ms`, preserving any signal the caller passed.
 *
 * Installed as the Supabase client's global fetch, which is the only way to
 * bound the token refresh auth-js fires on its own: that request is made deep
 * inside the library, so no call site can wrap it.
 */
export function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const outer = init?.signal;

    if (outer?.aborted) {
      return Promise.reject(outer.reason ?? new TimeoutError());
    }

    const onOuterAbort = () => controller.abort(outer?.reason);
    outer?.addEventListener('abort', onOuterAbort, { once: true });

    const timer = setTimeout(() => controller.abort(new TimeoutError()), ms);

    return fetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onOuterAbort);
    });
  };
}

/**
 * Ceiling for any single request the app makes. Deliberately generous: this is
 * a backstop against hanging forever, not a latency budget. A first full sync
 * on a slow connection must finish well inside it.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * How long the splash may wait on auth before the app boots from local data.
 * Short, because Dexie already holds everything the first screen needs.
 */
export const BOOT_AUTH_TIMEOUT_MS = 6_000;

/** How long a person may watch a spinner after tapping Sign in. */
export const INTERACTIVE_TIMEOUT_MS = 15_000;
