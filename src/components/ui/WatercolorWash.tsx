import { hexToRgba } from '../../lib/colors';

interface WatercolorWashProps {
  color: string;
}

/**
 * A decorative gradient that bleeds the course's accent color into the page
 * header, giving each course detail page its own atmospheric tint. Purely
 * visual — aria-hidden, pointer-events-none, absolutely positioned.
 */
export function WatercolorWash({ color }: WatercolorWashProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-40"
      style={{
        background: `linear-gradient(to bottom, ${hexToRgba(color, 0.18)} 0%, transparent 100%)`,
      }}
    />
  );
}
