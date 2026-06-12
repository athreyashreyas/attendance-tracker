import { useEffect } from 'react';

/**
 * Drive the layout from the *measured* visual viewport instead of CSS units.
 *
 * On iOS the installed PWA reports a visible viewport smaller than the physical
 * screen, and no CSS unit (dvh/lvh/vh/100%) lands on the real visible bottom.
 * So we measure visualViewport.height and offsetTop directly and expose them as
 * CSS variables; the shell is sized/positioned to exactly the visible area and
 * re-measured on every change (scroll, keyboard, focus, rotation), keeping the
 * bottom nav locked to the true bottom in all states.
 *
 *   --vvh : visible viewport height
 *   --vvt : visible viewport top offset
 *   --keyboard-height : layout viewport minus visible viewport (for sheets)
 */
export function useViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`);
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--keyboard-height', `${Math.round(kb)}px`);
    };

    update();
    // iOS settles the viewport a beat after launch; nudge a few times.
    const raf = requestAnimationFrame(update);
    const t1 = window.setTimeout(update, 200);
    const t2 = window.setTimeout(update, 600);

    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
