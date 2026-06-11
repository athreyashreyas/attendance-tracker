import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reads come from Dexie (local), so they are cheap and rarely stale.
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
