import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from './timeout';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'attend_auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    // Every request gets a ceiling. Without one, a server that answers the
    // connection but not the request leaves each call open forever, which is
    // how an outage turned into an app that never finished booting.
    global: {
      fetch: fetchWithTimeout(REQUEST_TIMEOUT_MS),
    },
  }
);
