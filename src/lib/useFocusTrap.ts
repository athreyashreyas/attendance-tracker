import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside `ref` while `active` is true. On open, focuses
 * the first focusable child (after one animation frame so the element is
 * visible). On close, returns focus to the element that was active before.
 * Tab/Shift+Tab cycle within the container (WCAG 2.1 SC 2.1.2).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  const savedFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    savedFocus.current = document.activeElement;

    const frameId = requestAnimationFrame(() => {
      const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', handleKeyDown);
      if (savedFocus.current instanceof HTMLElement) {
        savedFocus.current.focus();
      }
    };
  }, [active, ref]);
}
