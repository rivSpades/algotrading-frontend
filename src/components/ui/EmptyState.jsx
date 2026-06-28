import Button from './Button';

export default function EmptyState({ title, description, actionLabel, onAction, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {Icon && <Icon className="w-10 h-10 text-ink-tertiary mb-4" aria-hidden="true" />}
      <h3 className="text-h3 font-semibold text-ink mb-2">{title}</h3>
      {description && <p className="text-body text-ink-secondary max-w-md mb-6">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
