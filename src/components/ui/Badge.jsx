import { cn } from '../../lib/cn';
import { normalizeStatus, statusBadgeClasses, statusLabel } from '../../lib/statusTokens';

export default function Badge({ status, label, variant, className, showDot }) {
  const resolvedVariant = variant ?? normalizeStatus(status);
  const text = label ?? statusLabel(status);
  const isRunning = resolvedVariant === 'running';

  return (
    <span
      className={cn(
        'badge inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold',
        statusBadgeClasses(resolvedVariant),
        className,
      )}
    >
      {(showDot || isRunning) && isRunning && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
      )}
      {resolvedVariant === 'warning' && <span aria-hidden="true">⚠</span>}
      {text}
    </span>
  );
}
