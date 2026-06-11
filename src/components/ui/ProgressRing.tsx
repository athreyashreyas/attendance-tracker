import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { attendanceColor } from '../../lib/colors';

interface ProgressRingProps {
  value: number; // 0 - 100
  threshold?: number;
  size?: number;
  strokeWidth?: number;
  color?: string; // overrides the threshold-derived colour
  trackColor?: string;
  children?: ReactNode;
}

export function ProgressRing({
  value,
  threshold = 75,
  size = 88,
  strokeWidth = 8,
  color,
  trackColor = '#E0DCD2',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const target = useMotionValue(0);
  const animated = useSpring(target, { stiffness: 120, damping: 20 });
  const dashoffset = useTransform(animated, (v) => {
    const clamped = Math.min(Math.max(v, 0), 100);
    return circumference - (clamped / 100) * circumference;
  });

  useEffect(() => {
    target.set(value);
  }, [value, target]);

  const ringColor = color ?? attendanceColor(value, threshold);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashoffset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
