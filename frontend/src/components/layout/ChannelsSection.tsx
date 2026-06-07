import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PlatformBadge } from '../ui/PlatformBadge';
import { PLATFORMS } from '../../constants/platforms';
import { useChannels } from '../../lib/useChannels';
import { ConnectChannelModal } from '../channels/ConnectChannelModal';

export function ChannelsSection({ collapsed }: { collapsed: boolean }) {
  const { channels, status, loading } = useChannels();
  const [open, setOpen] = useState(false);

  return (
    <div>
      {!collapsed && (
        <div className="flex items-center justify-between px-3 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kênh
          </p>
          <span className="text-[11px] text-muted-foreground">
            {loading ? '…' : `${status.connected}/${status.total}`}
          </span>
        </div>
      )}

      <div className="space-y-1">
        {channels.map((c) => (
          <div
            key={c.id}
            title={
              collapsed
                ? `${PLATFORMS[c.platform].label} · ${c.accountName}`
                : undefined
            }
            className={cn(
              'flex items-center gap-2.5 rounded-button px-3 py-2',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className="relative shrink-0">
              <PlatformBadge platform={c.platform} size="sm" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-pill border-2 border-card',
                  c.connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : 'bg-amber-500',
                )}
              />
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-medium text-foreground">
                  {PLATFORMS[c.platform].label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.accountName}
                </p>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => setOpen(true)}
          title={collapsed ? 'Kết nối kênh' : undefined}
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 rounded-button px-3 py-2 text-body font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          <Plus className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Kết nối kênh</span>}
        </button>
      </div>

      <ConnectChannelModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
