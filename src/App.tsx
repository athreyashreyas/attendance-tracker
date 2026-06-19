import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { initAuth, useAuthStore } from './stores/authStore';
import { syncEngine } from './lib/sync';
import { useRealtime } from './hooks/useRealtime';
import { useViewport } from './hooks/useViewport';
import { QuotaToast } from './components/ui/QuotaToast';
import { UpdateOverlay } from './components/ui/UpdateOverlay';

function AppInner() {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  useViewport();

  useEffect(() => {
    initAuth();
    syncEngine.attachNetworkListeners();
  }, []);

  useEffect(() => {
    if (!userId) return;
    void syncEngine.initialHydrate(userId);
    // Pull fresh changes whenever the app comes back to the foreground, so
    // reopening it (e.g. on another device) reflects edits right away.
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void syncEngine.initialHydrate(userId);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId]);

  useRealtime(userId);

  return (
    <>
      <RouterProvider router={router} />
      <QuotaToast />
      <UpdateOverlay />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
