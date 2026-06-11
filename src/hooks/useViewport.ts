import { useEffect } from 'react';

/**
 * Pin the CSS variable `--app-height` to the measured visible-viewport height.
 *
 * iOS Safari resolves `100dvh` incorrectly on the first paint (the layout looks
 * short until a scroll nudges it) and never shrinks it for the on-screen
 * keyboard. Measuring `visualViewport.height` and updating on every viewport
 * event keeps full-height surfaces (the app shell, bottom sheets, modals)
 * exactly the size of the visible area, in any orientation and with the
 * keyboard open or closed.
 */
export function useViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty('--app-height', `${Math.round(h)}px`);
      // Keyboard height = layout viewport minus the visible viewport.
      const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      root.style.setProperty('--keyboard-height', `${Math.round(kb)}px`);
    };

    update();
    // iOS settles the viewport a beat after load; nudge a couple of times.
    const raf = requestAnimationFrame(update);
    const timer = setTimeout(update, 300);

    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);
}
