import type { Transition, Variants } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 400, damping: 30 };

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 120,
  damping: 20,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
};
