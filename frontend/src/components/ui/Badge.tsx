import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { STATUS_CONFIG, type PostStatus } from '../../constants/statuses';

/** Badge/tag chung */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-badge font-semibold',
        'bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Badge trạng thái bài đăng — nhất quán xuyên suốt app */
export function StatusBadge({
  status,
  className,
}: {
  status: PostStatus;
  className?: string;
}) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-badge font-semibold',
        c.badge,
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-pill', c.dot, c.pulse && 'animate-pulse')}
      />
      {c.label}
    </span>
  );
}
