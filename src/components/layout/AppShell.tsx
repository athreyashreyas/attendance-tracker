import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

/**
 * Fixed-height app shell sized to the measured visible viewport (--app-height).
 * Only the inner region scrolls; the safe-area top inset lives on <main> outside
 * the scroller, so content never slides under the status bar, and the nav (a
 * flex child, not position:fixed) stays pinned to the bottom on iOS.
 */
export function AppShell() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-parchment-100 md:flex-row">
      <SideNav />
      <main className="flex min-h-0 flex-1 flex-col pt-safe">
        <div className="scroll-ios min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-md px-4 pb-6 md:max-w-5xl md:px-8 md:pb-10 md:pt-8">
            <Outlet />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
