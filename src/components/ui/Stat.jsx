import { cn } from '../../lib/cn';
import { formatPnlValue, pnlClassName } from '../../lib/formatPnl';

export default function Stat({
  label,
  value,
  context,
  variant,
  format = 'text',
  currency = '$',
  className,
}) {
  let display = { text: value ?? '—', variant: variant ?? 'neutral', arrow: null };

  if (format === 'pnl' && value != null) {
    display = formatPnlValue(value, { currency });
  } else if (variant) {
    display.variant = variant;
  }

  const tone = pnlClassName(display.variant);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="stat__label">{label}</span>}
      <span
        className={cn(
          'stat-value font-mono font-semibold tabular-nums',
          format === 'pnl' ? 'text-display' : 'text-h2',
          tone,
        )}
      >
        {display.text}
        {display.arrow && (
          <span className="ml-1 text-sm" aria-hidden="true">
            {display.arrow}
          </span>
        )}
      </span>
      {context && <span className="text-sm text-ink-secondary">{context}</span>}
    </div>
  );
}
