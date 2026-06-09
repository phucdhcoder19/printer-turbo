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

export const socialAccountsApi = {
  list: (teamId: string) =>
    api
      .get<SocialAccount[]>('/api/social-accounts', { params: { teamId } })
      .then((r) => r.data),
  status: (teamId: string) =>
    api
      .get<ChannelStatus>('/api/social-accounts/status', { params: { teamId } })
      .then((r) => r.data),
  connect: (platform: Platform, teamId: string, accountName?: string) =>
    api
      .post<SocialAccount>(`/api/social-accounts/connect/${platform}`, {
        teamId,
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
  currentLikes: number;
  currentComments: number;
  currentShares: number;
}

export interface PostDto {
  id: string;
  title: string;
  baseCaption: string | null;
  status: PostStatus;
  createdAt: string;
  targets: PostTargetDto[];
}

export interface CreatePostBody {
  title: string;
  baseCaption?: string;
  contentPlanId?: string;
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
  remove: (id: string) =>
    api.delete(`/api/posts/${id}`).then((r) => r.data),
  updateTargetStatus: (targetId: string, status: string) =>
    api
      .patch(`/api/posts/target/${targetId}/status`, { status })
      .then((r) => r.data),
};

export default api;

