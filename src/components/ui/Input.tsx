import { forwardRef, useId } from 'react';

interface InputProps extends React.ComponentPropsWithoutRef<'input'> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, ...rest },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block font-sans text-xs font-medium text-ink-500"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`w-full rounded-lg border-0 bg-parchment-50 px-3.5 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 transition-shadow placeholder:text-ink-300 focus:ring-2 focus:ring-inset focus:ring-sage-400 ${
          error ? 'ring-rose-500 focus:ring-rose-500' : ''
        } ${className}`}
        {...rest}
      />
      {error && (
        <p className="mt-1.5 font-sans text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
});
