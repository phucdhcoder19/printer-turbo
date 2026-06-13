import axios from 'axios';
import type { Platform } from '../constants/platforms';
import type { PostStatus } from '../constants/statuses';

/**
 * Axios client trỏ tới NestJS backend (KHÔNG gọi thẳng FastAPI).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

// ---- Interceptors ----

// Tự gắn token vào MỌI request: Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mpt.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token hết hạn / không hợp lệ (401) → xoá phiên + về trang login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('mpt.token');
      localStorage.removeItem('mpt.user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ---- Auth ----

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    teamName?: string;
  }) => api.post<AuthResponse>('/api/auth/register', body).then((r) => r.data),

  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', body).then((r) => r.data),

  // Chỉ dùng để validate token còn sống (body trả về tối giản)
  me: () => api.get('/api/auth/me').then((r) => r.data),
};

// ---- Video (proxy sang FastAPI) ----

export interface CreateVideoPayload {
  topic: string;
  voice_name?: string;
  video_aspect?: '9:16' | '16:9' | '1:1';
  subtitle_enabled?: boolean;
}

export interface TaskResponse {
  task_id: string;
  state: string;
  progress: number;
  message?: string;
  videos?: string[];
}

export const videoApi = {
  create: (payload: CreateVideoPayload) =>
    api.post<TaskResponse>('/api/video/videos', payload).then((r) => r.data),
  getTask: (taskId: string) =>
    api.get<TaskResponse>(`/api/video/tasks/${taskId}`).then((r) => r.data),
};

// ---- Social accounts (channels) ----

export type ConnectionStatus = 'connected' | 'expired' | 'revoked' | 'pending';

export interface SocialAccount {
  id: string;
  teamId: string;
  platform: Platform;
  accountName: string;
  connectionStatus: ConnectionStatus;
  connectedAt: string | null;
  profileImageUrl: string | null;
}

export interface ChannelStatus {
  connected: number;
  total: number;
}

export interface ConnectWordpressBody {
  siteUrl: string;
  username: string;
  appPassword: string;
}

// teamId/userId lấy từ JWT (interceptor tự gắn token) → không truyền tay nữa.
export const socialAccountsApi = {
  list: () =>
    api.get<SocialAccount[]>('/api/social-accounts').then((r) => r.data),
  status: () =>
    api.get<ChannelStatus>('/api/social-accounts/status').then((r) => r.data),
  // OAuth (facebook/tiktok): lấy URL để redirect trình duyệt sang nền tảng.
  getConnectUrl: (platform: Platform) =>
    api
      .get<{ authorizeUrl: string }>(
        `/api/social-accounts/connect/${platform}/url`,
      )
      .then((r) => r.data),
  // WordPress: kết nối bằng Application Password.
  connectWordpress: (body: ConnectWordpressBody) =>
    api
      .post<SocialAccount>('/api/social-accounts/connect/wordpress', body)
      .then((r) => r.data),
  // Mock connect cho nền tảng chưa có OAuth thật.
  connect: (platform: Platform, accountName?: string) =>
    api
      .post<SocialAccount>(`/api/social-accounts/connect/${platform}`, {
        accountName,
      })
      .then((r) => r.data),
  disconnect: (id: string) =>
    api.delete(`/api/social-accounts/${id}`).then((r) => r.data),
};

// ---- Posts ----

export interface PostTargetDto {
  id: string;
  platform: Platform;
  caption: string | null;
  hashtags: string[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  currentLikes: number;
  currentComments: number;
  currentShares: number;
}

export interface PostMediaDto {
  id: string;
  position: number;
  media: MediaDto;
}

export interface PostDto {
  id: string;
  title: string;
  baseCaption: string | null;
  status: PostStatus;
  createdAt: string;
  targets: PostTargetDto[];
  media: PostMediaDto[];
}

export interface CreatePostBody {
  title: string;
  baseCaption?: string;
  contentPlanId?: string;
  mediaIds?: string[];
  targets: {
    platform: Platform;
    caption?: string;
    hashtags?: string[];
    scheduledAt?: string;
  }[];
}

export const postsApi = {
  list: () => api.get<PostDto[]>('/api/posts').then((r) => r.data),
  get: (id: string) => api.get<PostDto>(`/api/posts/${id}`).then((r) => r.data),
  create: (body: CreatePostBody) =>
    api.post<PostDto>('/api/posts', body).then((r) => r.data),
  update: (id: string, body: CreatePostBody) =>
    api.patch<PostDto>(`/api/posts/${id}`, body).then((r) => r.data),
  // Đăng NGAY bài lên tất cả nền tảng → trả post đã cập nhật trạng thái target.
  publish: (id: string) =>
    api.post<PostDto>(`/api/posts/${id}/publish`).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/posts/${id}`).then((r) => r.data),
  updateTargetStatus: (targetId: string, status: string) =>
    api
      .patch(`/api/posts/target/${targetId}/status`, { status })
      .then((r) => r.data),
};

// ---- Media (upload Cloudinary qua NestJS) ----

export interface MediaDto {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  fileName: string | null;
}

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    // KHÔNG set Content-Type — axios tự thêm boundary cho multipart
    return api.post<MediaDto>('/api/media', form).then((r) => r.data);
  },
};

// ---- Analytics ----

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AnalyticsSummary {
  posts: number; // số bài trong khoảng
  engagement: number; // tổng like + comment + share
  videos: number; // số video đã tạo (media source = mpt_generated)
  scheduled: number; // số target sắp đăng
  trends?: { posts: number; engagement: number }; // % so kỳ trước (âm = giảm)
}

export interface EngagementPoint {
  day: string; // nhãn trục X (vd "T2", "05/06")
  value: number; // tổng tương tác trong ngày
}

export interface PlatformStat {
  platform: Platform;
  engagement: number;
}

export interface TopPost {
  id: string;
  title: string;
  platform: Platform;
  engagement: number;
}

export const analyticsApi = {
  summary: (range: AnalyticsRange = '7d') =>
    api
      .get<AnalyticsSummary>('/api/analytics/summary', { params: { range } })
      .then((r) => r.data),
  engagement: (range: AnalyticsRange = '7d') =>
    api
      .get<EngagementPoint[]>('/api/analytics/engagement', { params: { range } })
      .then((r) => r.data),
  byPlatform: (range: AnalyticsRange = '7d') =>
    api
      .get<PlatformStat[]>('/api/analytics/by-platform', { params: { range } })
      .then((r) => r.data),
  topPosts: (range: AnalyticsRange = '7d', limit = 5) =>
    api
      .get<TopPost[]>('/api/analytics/top-posts', { params: { range, limit } })
      .then((r) => r.data),
};

// ---- AI (gợi ý caption / hashtag) ----

export interface AiCaptionResult {
  caption: string;
  hashtags: string[];
}

export const aiApi = {
  // topic = chủ đề bài (thường là tiêu đề); platform để AI viết hợp giọng nền tảng
  caption: (body: { topic: string; platform?: Platform; tone?: string }) =>
    api.post<AiCaptionResult>('/api/ai/caption', body).then((r) => r.data),
};

export default api;


