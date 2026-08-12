import { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { SyncDot } from '../ui/SyncIndicator';
import { useAutoArchive } from '../../hooks/useAutoArchive';
import { useGuidePrompt } from '../../hooks/useGuidePrompt';

/**
 * App shell sized via the html element's height (see index.css), which equals
 * the true full-screen height and shrinks correctly when the keyboard opens.
 * Only the inner region scrolls; the safe-area top inset lives on <main> outside
 * the scroller, so content never slides under the status bar, and the nav (a
 * flex child, not position:fixed) stays pinned to the bottom on iOS.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);

  // Terms and classes file themselves away once their last date has passed.
  useAutoArchive();
  // First run gets the walk-through; a new version gets What's new.
  useGuidePrompt();

  // The scroller lives here rather than on each page, so it keeps its position
  // across a navigation. Land at the top of every screen instead: a short page
  // opened from deep inside a long one would otherwise start out scrolled past
  // its own content, which reads as a blank screen.
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-parchment-100 md:flex-row">
      <SideNav />
      <main className="flex min-h-0 flex-1 flex-col pt-safe">
        <div
          ref={scroller}
          className="scroll-ios relative min-h-0 flex-1 overflow-y-auto"
        >
          <SyncDot />
          <div className="mx-auto w-full max-w-md px-4 pb-6 md:max-w-5xl md:px-8 md:pb-10 md:pt-8">
            <Outlet />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
