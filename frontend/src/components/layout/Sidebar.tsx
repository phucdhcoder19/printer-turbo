import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../lib/useAuth';
import { ChannelsSection } from './ChannelsSection';

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
}

const GROUPS: { title: string; items: NavItemDef[] }[] = [
  {
    title: 'Video',
    items: [
      { to: '/video', label: 'Tạo video', icon: Plus },
      { to: '/videos', label: 'Danh sách video', icon: Video },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
      { to: '/content', label: 'Content', icon: FileText },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary font-display font-bold text-primary-foreground">
          M
        </div>
        {!collapsed && (
          <span className="text-card-title font-display font-semibold">
            Marketing Hub
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}

        {/* Kênh đã kết nối (giống Buffer) */}
        <ChannelsSection collapsed={collapsed} />
      </nav>

      {/* Footer: settings + user */}
      <div className="border-t border-border p-3">
        <NavItem
          item={{ to: '/settings', label: 'Settings', icon: Settings }}
          collapsed={collapsed}
        />
        <div
          className={cn(
            'mt-2 flex items-center gap-2 rounded-button p-2',
            collapsed && 'justify-center',
          )}
        >
          <Avatar name={user?.name ?? 'User'} size="sm" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-label font-semibold text-foreground">
                  {user?.name ?? 'User'}
                </p>
                <p className="truncate text-[11px] capitalize text-muted-foreground">
                  {user?.role ?? ''}
                </p>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="cursor-pointer rounded-button p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  collapsed,
}: {
  item: NavItemDef;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-button px-3 py-2 text-body font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
