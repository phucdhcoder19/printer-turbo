import { type HTMLAttributes, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5', className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-card-title font-display font-semibold', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-border p-5', className)}
      {...props}
    />
  );
}

/** Stat card: icon + số lớn + label + trend indicator */
export function StatCard({
  icon,
  label,
  value,
  trend,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; direction: 'up' | 'down' };
  className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-button bg-primary/10 text-primary">
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-label font-semibold',
              trend.direction === 'up' ? 'text-green-600' : 'text-red-500',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-display font-bold tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 text-label text-muted-foreground">{label}</p>
    </Card>
  );
}
