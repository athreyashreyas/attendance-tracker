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

function AppInner() {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  useViewport();

  useEffect(() => {
    initAuth();
    syncEngine.attachNetworkListeners();
  }, []);

  useEffect(() => {
    if (userId) void syncEngine.initialHydrate(userId);
  }, [userId]);

  useRealtime(userId);

  return (
    <>
      <RouterProvider router={router} />
      <QuotaToast />
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
