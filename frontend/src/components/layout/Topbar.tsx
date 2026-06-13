import { Bell, Moon, PanelLeft, Search, Sun } from 'lucide-react';
import { useTheme } from '../../lib/useTheme';
import { Button } from '../ui/Button';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="z-topbar flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/70 px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Thu gọn sidebar"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </Button>

      {/* Search */}
      <div className="group relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
        <input
          type="search"
          placeholder="Tìm bài đăng, chiến dịch, kênh..."
          aria-label="Tìm kiếm"
          className="h-9 w-full rounded-button border border-transparent bg-muted/60 pl-9 pr-3 text-body placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="Đổi giao diện sáng/tối"
        >
          {theme === 'dark' ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Thông báo"
          className="relative"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-pill bg-accent ring-2 ring-card" />
        </Button>
      </div>
    </header>
  );
}
