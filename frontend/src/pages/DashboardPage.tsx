import {
  CalendarClock,
  FileText,
  Sparkles,
  ThumbsUp,
  Video,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import type { Platform } from '../constants/platforms';
import type { PostStatus } from '../constants/statuses';

const UPCOMING: {
  title: string;
  platform: Platform;
  status: PostStatus;
  time: string;
}[] = [
  { title: 'Ra mắt bộ sưu tập hè', platform: 'instagram', status: 'scheduled', time: 'Hôm nay, 18:00' },
  { title: 'Review sản phẩm mới', platform: 'tiktok', status: 'scheduled', time: 'Mai, 09:00' },
  { title: 'Khuyến mãi cuối tuần', platform: 'facebook', status: 'draft', time: 'T7, 12:00' },
];

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tổng quan hiệu quả content marketing tuần này."
        action={<Button leftIcon={<Sparkles className="h-4 w-4" />}>Tạo bài mới</Button>}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Bài đăng tuần này"
          value={24}
          trend={{ value: '12%', direction: 'up' }}
        />
        <StatCard
          icon={<ThumbsUp className="h-5 w-5" />}
          label="Tổng tương tác"
          value="8.2K"
          trend={{ value: '5%', direction: 'up' }}
        />
        <StatCard
          icon={<Video className="h-5 w-5" />}
          label="Video đã tạo"
          value={7}
          trend={{ value: '3%', direction: 'down' }}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Sắp đăng"
          value={5}
        />
      </div>

      {/* 2 columns */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bài sắp đăng</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {UPCOMING.map((post, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-button border border-border p-3 transition-colors hover:border-primary"
              >
                <PlatformBadge platform={post.platform} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-card-title font-semibold">
                    {post.title}
                  </p>
                  <p className="text-label text-muted-foreground">{post.time}</p>
                </div>
                <StatusBadge status={post.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gợi ý từ AI</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="Chưa có gợi ý"
              description="Tạo bài đăng rồi dùng AI để gợi ý caption, hashtag và giờ đăng tối ưu."
              action={<Button variant="secondary" size="sm">Thử AI ngay</Button>}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
