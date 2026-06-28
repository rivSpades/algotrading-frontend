import { cn } from '../../lib/cn';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('card__header', className)} {...props}>
      {children}
    </div>
  );
}

export function CardEyebrow({ className, children, ...props }) {
  return (
    <p className={cn('card__eyebrow', className)} {...props}>
      {children}
    </p>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h2 className={cn('text-h2 font-semibold text-ink', className)} {...props}>
      {children}
    </h2>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
