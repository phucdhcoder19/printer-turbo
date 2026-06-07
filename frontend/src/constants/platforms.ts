export type Platform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'twitter';

export interface PlatformConfig {
  label: string;
  color: string; // brand color (cố định)
  short: string; // ký hiệu ngắn khi chỉ hiện icon
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  facebook: { label: 'Facebook', color: '#1877F2', short: 'f' },
  instagram: { label: 'Instagram', color: '#E4405F', short: 'IG' },
  tiktok: { label: 'TikTok', color: '#010101', short: 'TT' },
  youtube: { label: 'YouTube', color: '#FF0000', short: 'YT' },
  threads: { label: 'Threads', color: '#000000', short: '@' },
  twitter: { label: 'X (Twitter)', color: '#000000', short: 'X' },
};

export const PLATFORM_LIST = Object.keys(PLATFORMS) as Platform[];
