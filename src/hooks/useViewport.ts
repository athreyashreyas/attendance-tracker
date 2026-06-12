import { useEffect } from 'react';

/**
 * Track how much of the bottom of the screen the on-screen keyboard covers,
 * exposed as --keyboard-height so portaled sheets can lift their content
 * above it. The shell itself is sized purely with CSS (see index.css), which
 * already shrinks correctly when the keyboard opens.
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
    window.addEventListener('orientationchange', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
}
