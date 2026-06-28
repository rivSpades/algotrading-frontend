import { cn } from '../../lib/cn';

export default function PageHeader({ title, eyebrow, description, actions, breadcrumb, className }) {
  return (
    <header className={cn('mb-6', className)}>
      {breadcrumb && <nav className="text-xs text-ink-tertiary mb-2">{breadcrumb}</nav>}
      {eyebrow && <p className="card__eyebrow mb-1">{eyebrow}</p>}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-ink tracking-tight">{title}</h1>
          {description && <p className="text-body text-ink-secondary mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
