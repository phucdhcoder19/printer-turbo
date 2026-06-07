import axios from 'axios';
import type { Platform } from '../constants/platforms';

/**
 * Axios client trỏ tới NestJS backend (KHÔNG gọi thẳng FastAPI).
 * NestJS lo proxy + auth + log.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

// ---- Video (proxy sang FastAPI) ----

export interface CreateVideoPayload {
  topic: string;
  voice_name?: string;
  video_aspect?: '9:16' | '16:9' | '1:1';
  subtitle_enabled?: boolean;
}

export interface TaskResponse {
  task_id: string;
  state: string; // processing | complete | failed
  progress: number; // 0-100
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

export type ConnectionStatus =
  | 'connected'
  | 'expired'
  | 'revoked'
  | 'pending';

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

export default api;
