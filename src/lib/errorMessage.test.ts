import { describe, expect, it } from 'vitest';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('takes the message off a real Error', () => {
    expect(errorMessage(new Error('Network request failed'))).toBe('Network request failed');
  });

  it('takes it off an Error subclass too', () => {
    class OfflineError extends Error {}
    expect(errorMessage(new OfflineError('You are offline'))).toBe('You are offline');
  });

  it('reads a Supabase PostgrestError, which is a plain object and not an Error', () => {
    // This is the whole reason the function exists: `instanceof Error` alone
    // dropped every database error on the floor and showed the fallback.
    const postgrest = {
      message: 'duplicate key value violates unique constraint',
      details: null,
      hint: null,
      code: '23505',
    };
    expect(errorMessage(postgrest)).toBe('duplicate key value violates unique constraint');
  });

  it('falls back for a thrown value that carries no message at all', () => {
    expect(errorMessage(undefined)).toBe('Something went wrong');
    expect(errorMessage(null)).toBe('Something went wrong');
    expect(errorMessage('a bare string')).toBe('Something went wrong');
    expect(errorMessage(42)).toBe('Something went wrong');
    expect(errorMessage({ code: 'PGRST116' })).toBe('Something went wrong');
  });

  it('lets the caller word its own fallback', () => {
    expect(errorMessage(null, 'Could not save that class')).toBe('Could not save that class');
  });

  it('never returns something that is not a string', () => {
    // A message field can hold anything; the caller renders it directly.
    expect(errorMessage({ message: 500 })).toBe('500');
    expect(errorMessage({ message: null })).toBe('null');
    expect(typeof errorMessage({ message: { nested: true } })).toBe('string');
  });

  it('prefers the Error message over the fallback even when it is empty', () => {
    // An empty message is still what was thrown; silently swapping in the
    // fallback would hide which error actually occurred.
    expect(errorMessage(new Error(''))).toBe('');
  });
});
