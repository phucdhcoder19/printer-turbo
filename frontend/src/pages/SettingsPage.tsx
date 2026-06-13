import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { EmptyState, Skeleton } from '../components/ui/Feedback';
import { ConnectChannelModal } from '../components/channels/ConnectChannelModal';
import { useChannels } from '../lib/useChannels';
import { useOAuthResult } from '../lib/useOAuthResult';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS } from '../constants/platforms';
import type { ConnectionStatus } from '../lib/api';

const STATUS_BADGE: Record<ConnectionStatus, { label: string; cls: string }> = {
  connected: {
    label: 'Đã kết nối',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  expired: {
    label: 'Hết hạn',
    cls: 'bg-amber-100/70 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  pending: {
    label: 'Đang chờ',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  revoked: {
    label: 'Đã thu hồi',
    cls: 'bg-stone-100 text-stone-600 dark:bg-stone-800/70 dark:text-stone-300',
  },
};

export function SettingsPage() {
  const { channels, loading, disconnect } = useChannels();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  // Bắt kết quả callback OAuth (?channel=...&result=...) sau khi kết nối FB/TikTok.
  useOAuthResult();

  async function handleDisconnect(id: string, label: string) {
    setBusy(id);
    try {
      await disconnect(id);
      toast('info', `Đã ngắt ${label}`);
    } catch {
      toast('error', 'Ngắt kết nối thất bại');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Tài khoản kết nối, thành viên team, hồ sơ cá nhân."
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Tài khoản đã kết nối</CardTitle>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpen(true)}
          >
            Kết nối kênh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : channels.length === 0 ? (
            <EmptyState
              title="Chưa kết nối kênh nào"
              description="Kết nối Facebook, TikTok, Instagram hoặc YouTube để đăng bài."
              action={
                <Button variant="secondary" onClick={() => setOpen(true)}>
                  Kết nối ngay
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {channels.map((c) => {
                const badge = STATUS_BADGE[c.connectionStatus];
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-button border border-border p-3"
                  >
                    <PlatformBadge platform={c.platform} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-card-title font-semibold">
                        {PLATFORMS[c.platform].label}
                      </p>
                      <p className="text-label text-muted-foreground">
                        {c.accountName}
                      </p>
                    </div>
                    <Badge className={badge.cls}>{badge.label}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={busy === c.id}
                      onClick={() =>
                        handleDisconnect(c.id, PLATFORMS[c.platform].label)
                      }
                    >
                      Ngắt
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConnectChannelModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
