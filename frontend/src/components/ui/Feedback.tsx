import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Empty state cho list/table rỗng: icon + title + mô tả + CTA */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-border px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-card-title font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-body text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Skeleton loader cho card/table khi đang tải */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
