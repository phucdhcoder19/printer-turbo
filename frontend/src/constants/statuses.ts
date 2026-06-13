export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'partially_failed'
  | 'failed';

export interface StatusConfig {
  label: string;
  /** className cho badge (đã gồm dark variant) */
  badge: string;
  /** className cho chấm tròn chỉ thị */
  dot: string;
  pulse?: boolean;
}

export const STATUS_CONFIG: Record<PostStatus, StatusConfig> = {
  draft: {
    label: 'Nháp',
    badge: 'bg-stone-100 text-stone-600 dark:bg-stone-800/70 dark:text-stone-300',
    dot: 'bg-stone-400',
  },
  scheduled: {
    label: 'Đã lên lịch',
    badge:
      'bg-amber-100/70 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  publishing: {
    label: 'Đang đăng',
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    dot: 'bg-sky-500',
    pulse: true,
  },
  published: {
    label: 'Đã đăng',
    badge:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  partially_failed: {
    label: 'Đăng một phần',
    badge:
      'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  failed: {
    label: 'Thất bại',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};
