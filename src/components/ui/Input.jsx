import { cn } from '../../lib/cn';

export default function Input({
  label,
  error,
  numeric,
  className,
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn('input', numeric && 'input--num', error && 'border-loss', className)}
        {...props}
      />
      {error && <p className="text-xs text-loss">{error}</p>}
    </div>
  );
}
