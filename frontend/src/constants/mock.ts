import type { Platform } from './platforms';
import type { PostStatus } from './statuses';

// ⚠️ Dữ liệu giả để dựng UI. Sau sẽ thay bằng API thật (/api/posts, /api/analytics).

export interface MockPost {
  id: string;
  title: string;
  platforms: Platform[];
  status: PostStatus;
  date: string;
  likes: number;
  comments: number;
  shares: number;
}

export const MOCK_POSTS: MockPost[] = [
  { id: '1', title: 'Ra mắt bộ sưu tập hè 2026', platforms: ['instagram', 'facebook'], status: 'published', date: '05/06 14:00', likes: 1240, comments: 86, shares: 45 },
  { id: '2', title: 'Review nhanh sản phẩm mới', platforms: ['tiktok'], status: 'scheduled', date: '10/06 09:00', likes: 0, comments: 0, shares: 0 },
  { id: '3', title: 'Khuyến mãi cuối tuần -30%', platforms: ['facebook', 'instagram', 'threads'], status: 'draft', date: '—', likes: 0, comments: 0, shares: 0 },
  { id: '4', title: 'Hướng dẫn sử dụng chi tiết', platforms: ['youtube'], status: 'published', date: '03/06 18:30', likes: 3200, comments: 210, shares: 120 },
  { id: '5', title: 'Behind the scenes buổi chụp', platforms: ['tiktok', 'instagram'], status: 'failed', date: '04/06 12:00', likes: 0, comments: 0, shares: 0 },
  { id: '6', title: 'Câu chuyện thương hiệu', platforms: ['facebook'], status: 'scheduled', date: '12/06 20:00', likes: 0, comments: 0, shares: 0 },
  { id: '7', title: 'Mini game tặng quà', platforms: ['instagram', 'facebook'], status: 'publishing', date: '07/06 10:00', likes: 540, comments: 320, shares: 88 },
];

export const MOCK_ENGAGEMENT_7D = [
  { day: 'T2', value: 420 },
  { day: 'T3', value: 560 },
  { day: 'T4', value: 480 },
  { day: 'T5', value: 720 },
  { day: 'T6', value: 690 },
  { day: 'T7', value: 910 },
  { day: 'CN', value: 1020 },
];

export interface PlatformStat {
  platform: Platform;
  engagement: number;
}

export const MOCK_PLATFORM_STATS: PlatformStat[] = [
  { platform: 'facebook', engagement: 4200 },
  { platform: 'instagram', engagement: 6800 },
  { platform: 'tiktok', engagement: 9100 },
  { platform: 'youtube', engagement: 3500 },
];

export interface CalendarEvent {
  id: string;
  title: string;
  platform: Platform;
  status: PostStatus;
  day: number; // ngày trong tháng (June 2026)
  time: string;
}

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Khuyến mãi cuối tuần', platform: 'facebook', status: 'scheduled', day: 8, time: '08:58' },
  { id: 'e2', title: 'Review sản phẩm', platform: 'tiktok', status: 'scheduled', day: 10, time: '09:00' },
  { id: 'e3', title: 'Câu chuyện thương hiệu', platform: 'facebook', status: 'scheduled', day: 12, time: '20:00' },
  { id: 'e4', title: 'Bộ sưu tập hè', platform: 'instagram', status: 'published', day: 5, time: '14:00' },
  { id: 'e5', title: 'Mini game', platform: 'instagram', status: 'publishing', day: 7, time: '10:00' },
  { id: 'e6', title: 'Hướng dẫn dùng', platform: 'youtube', status: 'published', day: 3, time: '18:30' },
  { id: 'e7', title: 'Teaser sản phẩm', platform: 'threads', status: 'draft', day: 15, time: '11:00' },
];

export interface TopPost {
  id: string;
  title: string;
  platform: Platform;
  engagement: number;
}

export const MOCK_TOP_POSTS: TopPost[] = [
  { id: 't1', title: 'Hướng dẫn sử dụng chi tiết', platform: 'youtube', engagement: 3530 },
  { id: 't2', title: 'Ra mắt bộ sưu tập hè 2026', platform: 'instagram', engagement: 1371 },
  { id: 't3', title: 'Mini game tặng quà', platform: 'facebook', engagement: 948 },
];

export const MOCK_AI_INSIGHTS = [
  'TikTok đang là nền tảng tương tác cao nhất (+18% so với tuần trước).',
  'Khung 20:00–21:00 cho lượt tiếp cận tốt nhất với nội dung video.',
  'Bài có hashtag #sale đạt tương tác cao hơn trung bình 24%.',
];
