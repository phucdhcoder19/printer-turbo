import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PlatformBadge } from '../ui/PlatformBadge';
import {
  CONNECT_METHOD,
  PLATFORM_LIST,
  PLATFORMS,
  type Platform,
} from '../../constants/platforms';
import { useChannels } from '../../lib/useChannels';
import { useToast } from '../ui/Toast';
import { WordpressConnectForm } from './WordpressConnectForm';

export function ConnectChannelModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { channels, connect, disconnect } = useChannels();
  const toast = useToast();
  // key đang xử lý: platform (khi connect) hoặc id account (khi disconnect)
  const [busy, setBusy] = useState<string | null>(null);
  // platform đang mở form WordPress (chỉ 1 lúc)
  const [wpOpen, setWpOpen] = useState<Platform | null>(null);

  async function handleConnect(platform: Platform) {
    const method = CONNECT_METHOD[platform];
    // WordPress: mở form inline thay vì gọi connect ngay.
    if (method === 'wordpress') {
      setWpOpen((cur) => (cur === platform ? null : platform));
      return;
    }
    setBusy(platform);
    try {
      // oauth → connect() sẽ redirect trình duyệt sang nền tảng (không quay lại đây).
      await connect(platform);
      if (method === 'mock') {
        toast('success', `Đã kết nối ${PLATFORMS[platform].label}`);
      }
    } catch (err) {
      // Hiện đúng lỗi backend trả về (vd "Chưa cấu hình Facebook App...") để dễ sửa.
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? `Kết nối ${PLATFORMS[platform].label} thất bại`;
      toast('error', msg);
    } finally {
      setBusy(null);
    }
  }

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
    <Modal open={open} onClose={onClose} title="Kết nối kênh">
      <p className="text-body text-muted-foreground">
        Chọn nền tảng để kết nối tài khoản đăng bài.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {PLATFORM_LIST.map((platform) => {
          const existing = channels.find((c) => c.platform === platform);
          const method = CONNECT_METHOD[platform];
          return (
            <div
              key={platform}
              className="rounded-button border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <PlatformBadge platform={platform} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-card-title font-semibold">
                    {PLATFORMS[platform].label}
                  </p>
                  <p className="text-label text-muted-foreground">
                    {existing ? existing.accountName : 'Chưa kết nối'}
                  </p>
                </div>
                {existing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busy === existing.id}
                    onClick={() =>
                      handleDisconnect(existing.id, PLATFORMS[platform].label)
                    }
                  >
                    Ngắt
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busy === platform}
                    leftIcon={
                      busy === platform ? undefined : (
                        <Plus className="h-4 w-4" />
                      )
                    }
                    onClick={() => handleConnect(platform)}
                  >
                    Kết nối
                  </Button>
                )}
              </div>

              {/* Form WordPress inline (Application Password) */}
              {method === 'wordpress' && wpOpen === platform && !existing && (
                <WordpressConnectForm onDone={() => setWpOpen(null)} />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
