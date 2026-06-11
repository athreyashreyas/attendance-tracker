import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard height via the VisualViewport API and exposes it
 * as the CSS variable `--keyboard-height`. iOS does not shrink the layout
 * viewport (or `dvh`) when the keyboard opens, so without this a bottom sheet's
 * inputs end up hidden behind the keyboard. Call once at app root.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--keyboard-height', `${inset}px`);
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
