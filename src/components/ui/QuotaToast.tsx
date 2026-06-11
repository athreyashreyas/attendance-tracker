import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** One-off toast shown when IndexedDB hits its storage quota. */
export function QuotaToast() {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler() {
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 5000);
    }
    window.addEventListener('attend:quota', handler);
    return () => {
      window.removeEventListener('attend:quota', handler);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-card bg-ink-900 px-4 py-3 text-center font-sans text-sm text-white shadow-lg"
        >
          Storage nearly full. Export your data to free up space.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
