import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-parchment-100">
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-safe">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
