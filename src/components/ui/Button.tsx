import { motion, type HTMLMotionProps } from 'framer-motion';
import { spring } from '../../lib/motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-sage-500 text-white shadow-sm',
  secondary: 'bg-parchment-200 text-ink-900',
  ghost: 'bg-transparent text-ink-700',
  danger: 'bg-rose-500 text-white shadow-sm',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={spring}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-sans font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
