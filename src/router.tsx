import type { ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { QuickMarkPage } from './pages/QuickMarkPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './hooks/useAuth';

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment-100">
      <Loader2 size={28} className="animate-spin text-sage-500" />
    </div>
  );
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
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/courses/:id', element: <CourseDetailPage /> },
      { path: '/quick-mark', element: <QuickMarkPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
