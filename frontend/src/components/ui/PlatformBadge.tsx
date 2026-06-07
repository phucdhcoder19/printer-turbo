import { cn } from '../../lib/cn';
import { PLATFORMS, type Platform } from '../../constants/platforms';

/**
 * Badge nền tảng. size='sm' → chỉ icon ô vuông; size='md' → icon + tên.
 * Màu brand cố định nên dùng inline style (không phải design token).
 */
export function PlatformBadge({
  platform,
  size = 'md',
  className,
}: {
  platform: Platform;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const p = PLATFORMS[platform];

  if (size === 'sm') {
    return (
      <span
        aria-label={p.label}
        title={p.label}
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white',
          className,
        )}
        style={{ backgroundColor: p.color }}
      >
        {p.short}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-label font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: p.color }}
    >
      <span className="text-[10px] font-bold">{p.short}</span>
      {p.label}
    </span>
  );
}
