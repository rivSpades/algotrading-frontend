import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'btn btn--primary',
  secondary: 'btn btn--secondary',
  ghost: 'btn btn--ghost',
  danger: 'btn btn--danger',
};

export default function Button({
  variant = 'primary',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        VARIANTS[variant] ?? VARIANTS.primary,
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
