/**
 * A styled native date picker, matching the app's text Input. Centralises the
 * field styling that was previously copied into every form with a date.
 */
export function DateInput({
  className = '',
  ...rest
}: Omit<React.ComponentPropsWithoutRef<'input'>, 'type'>) {
  return (
    <input
      type="date"
      className={`w-full rounded-lg border-0 bg-parchment-50 px-3.5 py-2.5 font-sans text-sm text-ink-900 ring-1 ring-inset ring-ink-100 transition-shadow focus:ring-2 focus:ring-inset focus:ring-sage-400 ${className}`}
      {...rest}
    />
  );
}
