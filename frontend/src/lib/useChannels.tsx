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
import { getTeamId } from './session';
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
 * Nguồn dữ liệu kênh — gọi NestJS /api/social-accounts.
 * Mọi thao tác connect/disconnect đều refetch để UI luôn khớp DB.
 */
export function ChannelsProvider({ children }: { children: ReactNode }) {
  const teamId = getTeamId();
  const [channels, setChannels] = useState<SocialAccount[]>([]);
  const [status, setStatus] = useState<ChannelStatus>({
    connected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [list, st] = await Promise.all([
      socialAccountsApi.list(teamId),
      socialAccountsApi.status(teamId),
    ]);
    setChannels(list);
    setStatus(st);
  }, [teamId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    refresh()
      .catch(() => {
        /* backend chưa chạy → để danh sách rỗng, action sẽ báo toast lỗi */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const connect = useCallback(
    async (platform: Platform) => {
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
