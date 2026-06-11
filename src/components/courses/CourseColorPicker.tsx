import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { COURSE_COLORS } from '../../lib/colors';

interface CourseColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function CourseColorPicker({ value, onChange }: CourseColorPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {COURSE_COLORS.map((c) => (
        <motion.button
          key={c.hex}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(c.hex)}
          aria-label={c.label}
          aria-pressed={value === c.hex}
          className="flex aspect-square items-center justify-center rounded-xl ring-offset-2 ring-offset-parchment-50 transition-shadow"
          style={{
            backgroundColor: c.hex,
            boxShadow: value === c.hex ? `0 0 0 2px ${c.hex}` : undefined,
          }}
        >
          {value === c.hex && (
            <Check size={20} strokeWidth={3} className="text-white" />
          )}
        </motion.button>
      ))}
    </div>
  );
}
