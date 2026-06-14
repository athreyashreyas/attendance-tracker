import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from 'framer-motion';
import { spring } from '../../lib/motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const dragControls = useDragControls();

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        // Pinned to the true viewport bottom and rendered above the nav so the
        // panel (and its Save button) always clears the tab bar, toolbar, and
        // keyboard, in any orientation.
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col justify-end"
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
            className="scroll-ios relative max-h-[90%] overflow-y-auto rounded-t-sheet bg-parchment-50 pt-3 shadow-2xl safe-bottom"
            style={{
              marginBottom: 'var(--keyboard-height, 0px)',
              paddingLeft: 'max(1.25rem, var(--safe-left))',
              paddingRight: 'max(1.25rem, var(--safe-right))',
              transition: 'margin-bottom 0.2s ease',
            }}
            // Only the grip handle drags the sheet; the body scrolls freely.
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            variants={{ hidden: { y: '100%' }, visible: { y: 0 } }}
            transition={spring}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="-mt-3 flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <div className="h-1.5 w-10 rounded-full bg-ink-100" />
            </div>
            {title && (
              <h2 className="mb-5 font-serif text-2xl text-ink-900">{title}</h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
