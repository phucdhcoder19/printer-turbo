import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  socialAccountsApi,
  type ChannelStatus,
  type ConnectWordpressBody,
  type SocialAccount,
} from './api';
import { useAuth } from './useAuth';
import { CONNECT_METHOD, type Platform } from '../constants/platforms';

interface ChannelsContextValue {
  channels: SocialAccount[];
  status: ChannelStatus;
  loading: boolean;
  /** facebook/tiktok → redirect OAuth; nền tảng mock → tạo account demo. */
  connect: (platform: Platform) => Promise<void>;
  /** WordPress → kết nối bằng Application Password. */
  connectWordpress: (body: ConnectWordpressBody) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

/**
 * Dữ liệu kênh — gọi NestJS /api/social-accounts. teamId/userId lấy từ JWT
 * (token tự gắn qua interceptor), không truyền tay.
 */
export function ChannelsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const teamId = user?.teamId;

  const [channels, setChannels] = useState<SocialAccount[]>([]);
  const [status, setStatus] = useState<ChannelStatus>({
    connected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!teamId) return;
    const [list, st] = await Promise.all([
      socialAccountsApi.list(),
      socialAccountsApi.status(),
    ]);
    setChannels(list);
    setStatus(st);
  }, [teamId]);

  useEffect(() => {
    // Chưa đăng nhập → để rỗng
    if (!teamId) {
      setChannels([]);
      setStatus({ connected: 0, total: 0 });
      return;
    }
    let alive = true;
    setLoading(true);
    refresh()
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [teamId, refresh]);

  const connect = useCallback(
    async (platform: Platform) => {
      if (!teamId) return;
      const method = CONNECT_METHOD[platform];
      if (method === 'oauth') {
        // Rời trang sang nền tảng để xin quyền. Sau khi đồng ý, backend xử lý
        // callback rồi redirect ngược về /settings?channel=...&result=...
        const { authorizeUrl } = await socialAccountsApi.getConnectUrl(platform);
        window.location.href = authorizeUrl;
        return;
      }
      // mock (instagram/youtube/threads/twitter)
      await socialAccountsApi.connect(platform);
      await refresh();
    },
    [teamId, refresh],
  );

  const connectWordpress = useCallback(
    async (body: ConnectWordpressBody) => {
      if (!teamId) return;
      await socialAccountsApi.connectWordpress(body);
      await refresh();
    },
    [teamId, refresh],
  );

  const disconnect = useCallback(
    async (id: string) => {
      await socialAccountsApi.disconnect(id);
      await refresh();
    },
    [refresh],
  );

  return (
    <ChannelsContext.Provider
      value={{
        channels,
        status,
        loading,
        connect,
        connectWordpress,
        disconnect,
        refresh,
      }}
    >
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels() {
  const ctx = useContext(ChannelsContext);
  if (!ctx) throw new Error('useChannels phải nằm trong <ChannelsProvider>');
  return ctx;
}
