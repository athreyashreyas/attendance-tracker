import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './hooks/useAuth';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CourseDetailPage = lazy(() =>
  import('./pages/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage }))
);
const QuickMarkPage = lazy(() =>
  import('./pages/QuickMarkPage').then((m) => ({ default: m.QuickMarkPage }))
);
const CalendarPage = lazy(() =>
  import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment-100">
      <Loader2 size={28} className="animate-spin text-sage-500" />
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Splash />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  if (isLoading) return <Splash />;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <Splash />;
  return <Navigate to={session ? '/dashboard' : '/auth'} replace />;
}

export const router = createHashRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/auth', element: <AuthPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <LazyPage><DashboardPage /></LazyPage>,
      },
      {
        path: '/courses/:id',
        element: <LazyPage><CourseDetailPage /></LazyPage>,
      },
      {
        path: '/quick-mark',
        element: <LazyPage><QuickMarkPage /></LazyPage>,
      },
      {
        path: '/calendar',
        element: <LazyPage><CalendarPage /></LazyPage>,
      },
      {
        path: '/settings',
        element: <LazyPage><SettingsPage /></LazyPage>,
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
