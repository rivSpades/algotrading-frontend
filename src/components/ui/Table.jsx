import { cn } from '../../lib/cn';

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto md:overflow-visible">
      <table className={cn('table w-full', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, ...props }) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableRow({ className, children, mobileCard, ...props }) {
  if (mobileCard) {
    return (
      <tr className={cn('md:table-row hidden', className)} {...props}>
        {children}
      </tr>
    );
  }
  return (
    <tr className={cn('hover:bg-surface-hover', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({ className, priority, children, ...props }) {
  const hidden =
    priority === 2 ? 'hidden md:table-cell' : priority === 3 ? 'hidden lg:table-cell' : '';
  return (
    <th scope="col" className={cn(hidden, className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className, numeric, priority, children, ...props }) {
  const hidden =
    priority === 2 ? 'hidden md:table-cell' : priority === 3 ? 'hidden lg:table-cell' : '';
  return (
    <td className={cn(hidden, numeric && 'num text-right font-mono', className)} {...props}>
      {children}
    </td>
  );
}

/** Mobile card row — one record as card below md breakpoint */
export function MobileTableCard({ title, subtitle, meta, children, className }) {
  return (
    <div
      className={cn(
        'md:hidden border border-border rounded-lg bg-surface p-4 mb-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold text-ink">{title}</div>
          {subtitle && <div className="text-sm text-ink-secondary">{subtitle}</div>}
        </div>
        {meta}
      </div>
      {children}
    </div>
  );
}

export default Table;
