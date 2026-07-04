/**
 * Extract a human-readable message from any thrown value. Handles both native
 * Error instances and Supabase's plain-object PostgrestError shape (which has
 * `.message` but is not an Error instance).
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}
