import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

/**
 * Fixed-height app shell: the shell itself never scrolls, only <main> does.
 * This keeps the nav (a flex child, not position:fixed) pinned to the bottom on
 * iOS regardless of the dynamic toolbar or overscroll, with no drifting or gaps.
 */
export function AppShell() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-parchment-100 md:flex-row">
      <SideNav />
      <main className="scroll-ios flex-1 overflow-y-auto md:min-w-0">
        <div className="mx-auto w-full max-w-md px-4 pb-6 pt-safe md:max-w-5xl md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
