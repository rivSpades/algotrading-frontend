import { Card, CardBody, CardEyebrow } from './ui/Card';
import Stat from './ui/Stat';

export default function StatisticsCard({
  title,
  value,
  unit = '',
  description = '',
  icon: Icon = null,
  additionalInfo = null,
  format = 'text',
  pnl = false,
}) {
  const displayValue =
    value !== null && value !== undefined
      ? typeof value === 'number' && !pnl
        ? value.toFixed(2)
        : value
      : null;

  return (
    <Card className="p-5">
      <CardBody>
        <div className="flex items-start gap-2 mb-2">
          {Icon && <Icon className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden="true" />}
          <CardEyebrow className="mb-0">{title}</CardEyebrow>
        </div>
        {displayValue != null ? (
          pnl ? (
            <Stat label={null} value={displayValue} format="pnl" />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-h2 font-semibold font-mono tabular-nums text-ink">{displayValue}</span>
              {unit && <span className="text-sm text-ink-secondary">{unit}</span>}
            </div>
          )
        ) : (
          <div className="text-ink-tertiary text-body mt-1">N/A</div>
        )}
        {additionalInfo && <div className="mt-2 text-sm text-ink-secondary">{additionalInfo}</div>}
        {description && <p className="text-xs text-ink-tertiary mt-2">{description}</p>}
      </CardBody>
    </Card>
  );
}
