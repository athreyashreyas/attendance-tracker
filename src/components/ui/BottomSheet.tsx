import type { ReactNode } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { spring } from '../../lib/motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 z-50 flex h-[var(--app-height)] flex-col justify-end"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-ink-900/40"
            onClick={onClose}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          />
          <motion.div
            className="scroll-ios relative max-h-full overflow-y-auto rounded-t-sheet bg-parchment-50 pt-3 shadow-2xl safe-bottom"
            style={{
              paddingLeft: 'max(1.25rem, var(--safe-left))',
              paddingRight: 'max(1.25rem, var(--safe-right))',
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            variants={{ hidden: { y: '100%' }, visible: { y: 0 } }}
            transition={spring}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink-100" />
            {title && (
              <h2 className="mb-5 font-serif text-2xl text-ink-900">{title}</h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
