export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
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
    label: 'Draft',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
  scheduled: {
    label: 'Scheduled',
    badge:
      'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  publishing: {
    label: 'Publishing',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
    dot: 'bg-blue-500',
    pulse: true,
  },
  published: {
    label: 'Published',
    badge:
      'bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-300',
    dot: 'bg-green-500',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
    dot: 'bg-red-500',
  },
};
