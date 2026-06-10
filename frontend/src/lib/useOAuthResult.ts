import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { useChannels } from './useChannels';
import { PLATFORMS, type Platform } from '../constants/platforms';

type Result = 'connected' | 'error' | 'no_pages';

/**
 * Sau khi OAuth (Facebook/TikTok) xong, backend redirect về
 * /settings?channel=<platform>&result=<connected|error|no_pages>.
 * Hook này đọc query đó → toast + refresh danh sách kênh → xoá query khỏi URL
 * (tránh toast lại khi reload).
 */
export function useOAuthResult() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { refresh } = useChannels();
  // Tránh chạy 2 lần (StrictMode mount/unmount) cho cùng 1 query.
  const handled = useRef(false);

  useEffect(() => {
    const channel = params.get('channel') as Platform | null;
    const result = params.get('result') as Result | null;
    if (!channel || !result || handled.current) return;
    handled.current = true;

    const label = PLATFORMS[channel]?.label ?? channel;
    if (result === 'connected') {
      toast('success', `Đã kết nối ${label}`);
      refresh().catch(() => {});
    } else if (result === 'no_pages') {
      toast('error', `${label}: tài khoản không có Page nào để kết nối`);
    } else {
      toast('error', `Kết nối ${label} thất bại`);
    }

    // Xoá query để URL sạch + không lặp toast khi reload.
    params.delete('channel');
    params.delete('result');
    setParams(params, { replace: true });
  }, [params, setParams, toast, refresh]);
}
