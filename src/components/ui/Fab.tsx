import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FabProps {
  onClick: () => void;
  label: string;
}

/**
 * Floating "+" action, pinned above the bottom nav on phones and to the corner
 * on larger screens. Shared by the dashboard and course detail.
 */
export function Fab({ onClick, label }: FabProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="fixed bottom-[calc(5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-30 flex h-14 w-14 items-center justify-center rounded-fab bg-sage-500 text-white shadow-lg md:bottom-[calc(2rem+var(--safe-bottom))] md:right-[calc(2rem+var(--safe-right))]"
      aria-label={label}
    >
      <Plus size={26} />
    </motion.button>
  );
}
