import { useEffect } from 'react';

/**
 * Track the on-screen keyboard height as the CSS variable `--keyboard-height`,
 * via the VisualViewport API. iOS does not shrink the layout viewport when the
 * keyboard opens, so bottom sheets use this to lift their content above it.
 *
 * Full-height layout is handled purely by the locked <body> (position:fixed,
 * inset:0) + height:100%, so no measured height variable is needed.
 */
export function useViewport(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--keyboard-height', `${Math.round(kb)}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}
