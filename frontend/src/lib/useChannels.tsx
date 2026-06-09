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
  type SocialAccount,
} from './api';
import { useAuth } from './useAuth';
import type { Platform } from '../constants/platforms';

interface ChannelsContextValue {
  channels: SocialAccount[];
  status: ChannelStatus;
  loading: boolean;
  connect: (platform: Platform) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextValue | null>(null);

/**
 * Dữ liệu kênh — gọi NestJS /api/social-accounts theo teamId của user đăng nhập.
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
      socialAccountsApi.list(teamId),
      socialAccountsApi.status(teamId),
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
      await socialAccountsApi.connect(platform, teamId);
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
      value={{ channels, status, loading, connect, disconnect, refresh }}
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
