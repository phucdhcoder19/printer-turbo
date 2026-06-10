export type Platform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'twitter'
  | 'wordpress';

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
  wordpress: { label: 'WordPress', color: '#21759B', short: 'WP' },
};

/** Cách kết nối từng nền tảng → UI rẽ nhánh button/form. */
export const CONNECT_METHOD: Record<Platform, 'oauth' | 'wordpress' | 'mock'> = {
  facebook: 'oauth',
  tiktok: 'oauth',
  wordpress: 'wordpress',
  instagram: 'mock',
  youtube: 'mock',
  threads: 'mock',
  twitter: 'mock',
};

export const PLATFORM_LIST = Object.keys(PLATFORMS) as Platform[];
