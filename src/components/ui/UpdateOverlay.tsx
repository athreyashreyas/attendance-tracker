import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Full-screen overlay shown briefly while the app reloads into a new version,
 * so a live update feels intentional rather than an abrupt refresh.
 */
export function UpdateOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('attend:updating', handler);
    return () => window.removeEventListener('attend:updating', handler);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-parchment-100"
        >
          <motion.span
            initial={{ scale: 0.96, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-serif text-3xl text-ink-900"
          >
            Attend
          </motion.span>
          <div className="mt-4 flex items-center gap-2 text-ink-500">
            <Loader2 size={16} className="animate-spin text-sage-500" />
            <span className="font-sans text-sm">Updating to the latest version</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
