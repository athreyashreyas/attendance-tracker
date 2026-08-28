import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The regression these cover: during the Supabase incident of 27 Aug 2026 auth
// accepted connections but never answered, so the unbounded getSession() at
// startup never settled, isLoading stayed true, and the app sat on its splash
// forever. Dexie already held everything the first screen needed.

const getSession = vi.fn();
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
const signOut = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange, signOut } },
}));
vi.mock('../lib/db', () => ({ clearLocalDb: vi.fn(() => Promise.resolve()) }));
vi.mock('../lib/sync', () => ({ syncEngine: { reset: vi.fn() } }));
vi.mock('../lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));

/** Minimal localStorage, since the suite runs in the node environment. */
function stubStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

/** A fresh copy of the store, since initAuth deliberately runs only once. */
async function loadAuthModule() {
  vi.resetModules();
  return import('./authStore');
}

const SESSION = { user: { id: 'user-123' } };

beforeEach(() => {
  vi.useFakeTimers();
  getSession.mockReset();
  onAuthStateChange.mockClear();
  // The store warns on an unconfirmed boot by design; keep it out of the run.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('startup when the server never answers', () => {
  it('opens on local data for a device that was signed in, instead of hanging on the splash', async () => {
    stubStorage({ 'attend.lastUserId': 'user-123' });
    getSession.mockReturnValue(new Promise(() => {})); // never settles

    const { initAuth, selectUserId, useAuthStore } = await loadAuthModule();
    initAuth();

    // Before the bound elapses the splash is correct: we may still hear back.
    expect(useAuthStore.getState().isLoading).toBe(true);

    await vi.advanceTimersByTimeAsync(6_000);

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(selectUserId(state)).toBe('user-123');
  });

  it('lands on sign-in when the device has no remembered account', async () => {
    stubStorage();
    getSession.mockReturnValue(new Promise(() => {}));

    const { initAuth, selectUserId, useAuthStore } = await loadAuthModule();
    initAuth();
    await vi.advanceTimersByTimeAsync(6_000);

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(selectUserId(state)).toBeNull();
  });

  it('treats a failed refresh as unconfirmed, not as a sign-out', async () => {
    // auth-js reports a refresh it could not complete as an error beside a null
    // session rather than as a rejection. Reading only the session would strand
    // someone with a full local database on the sign-in screen.
    stubStorage({ 'attend.lastUserId': 'user-123' });
    getSession.mockResolvedValue({
      data: { session: null },
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
    });

    const { initAuth, selectUserId, useAuthStore } = await loadAuthModule();
    initAuth();
    await vi.advanceTimersByTimeAsync(1);

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(selectUserId(state)).toBe('user-123');
  });

  it('recovers from a rejection too, not only from a hang', async () => {
    stubStorage({ 'attend.lastUserId': 'user-123' });
    getSession.mockReturnValue(
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('network')), 10))
    );

    const { initAuth, selectUserId, useAuthStore } = await loadAuthModule();
    initAuth();
    await vi.advanceTimersByTimeAsync(10);

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(selectUserId(state)).toBe('user-123');
  });
});

describe('startup when the server answers', () => {
  it('takes the confirmed session and remembers the account for a future offline boot', async () => {
    const store = stubStorage();
    getSession.mockResolvedValue({ data: { session: SESSION } });

    const { initAuth, useAuthStore } = await loadAuthModule();
    initAuth();
    await vi.advanceTimersByTimeAsync(1);

    expect(useAuthStore.getState().session).toEqual(SESSION);
    expect(useAuthStore.getState().unverifiedUserId).toBeNull();
    expect(store.get('attend.lastUserId')).toBe('user-123');
  });

  it('clears the remembered account when there is no session', async () => {
    const store = stubStorage({ 'attend.lastUserId': 'user-123' });
    getSession.mockResolvedValue({ data: { session: null } });

    const { initAuth, useAuthStore } = await loadAuthModule();
    initAuth();
    await vi.advanceTimersByTimeAsync(1);

    expect(useAuthStore.getState().session).toBeNull();
    expect(store.has('attend.lastUserId')).toBe(false);
  });
});

describe('signing out', () => {
  it('clears this device even when the server never answers the sign-out', async () => {
    const store = stubStorage({ 'attend.lastUserId': 'user-123' });
    getSession.mockResolvedValue({ data: { session: SESSION } });
    signOut.mockReturnValue(new Promise(() => {}) as Promise<{ error: null }>);

    const { useAuthStore } = await loadAuthModule();
    const done = useAuthStore.getState().signOut();
    await vi.advanceTimersByTimeAsync(15_000);
    await done;

    expect(useAuthStore.getState().session).toBeNull();
    expect(store.has('attend.lastUserId')).toBe(false);
  });
});
