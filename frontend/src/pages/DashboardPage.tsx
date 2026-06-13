import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  FileText,
  Sparkles,
  ThumbsUp,
  Video,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { EmptyState, Skeleton } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import {
  analyticsApi,
  postsApi,
  type AnalyticsSummary,
  type EngagementPoint,
  type PostDto,
} from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { Platform } from '../constants/platforms';
import type { PostStatus } from '../constants/statuses';

interface UpcomingItem {
  id: string;
  title: string;
  platform: Platform;
  status: PostStatus;
  scheduledAt: string;
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  posts: 0,
  engagement: 0,
  videos: 0,
  scheduled: 0,
};

// Chuẩn hoá: phòng khi BE trả 200 nhưng thiếu field (vd endpoint còn là stub) →
// mỗi field thiếu rớt về 0, tránh undefined.toLocaleString().
function normalizeSummary(raw: unknown): AnalyticsSummary {
  const r = (raw ?? {}) as Partial<AnalyticsSummary>;
  return {
    posts: r.posts ?? 0,
    engagement: r.engagement ?? 0,
    videos: r.videos ?? 0,
    scheduled: r.scheduled ?? 0,
    trends: r.trends,
  };
}

// % → props cho StatCard.trend (bỏ qua khi không có dữ liệu)
function toTrend(pct?: number) {
  if (pct === undefined || pct === null) return undefined;
  return {
    value: `${Math.abs(pct)}%`,
    direction: (pct >= 0 ? 'up' : 'down') as 'up' | 'down',
  };
}

// Lấy các bài có target đã lên lịch (sắp tới), gần nhất lên đầu.
function upcomingFrom(posts: PostDto[]): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const post of posts) {
    const next = post.targets
      .filter((t) => t.status === 'scheduled' && t.scheduledAt)
      .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!))[0];
    if (next) {
      items.push({
        id: post.id,
        title: post.title,
        platform: next.platform,
        status: post.status,
        scheduledAt: next.scheduledAt!,
      });
    }
  }
  return items
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 4);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [engagement, setEngagement] = useState<EngagementPoint[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // allSettled: 1 endpoint chưa sẵn sàng (BE đang làm) cũng không làm vỡ trang.
    Promise.allSettled([
      analyticsApi.summary('7d'),
      analyticsApi.engagement('7d'),
      postsApi.list(),
    ])
      .then(([s, e, p]) => {
        if (s.status === 'fulfilled') setSummary(normalizeSummary(s.value));
        if (e.status === 'fulfilled' && Array.isArray(e.value)) setEngagement(e.value);
        if (p.status === 'fulfilled') setUpcoming(upcomingFrom(p.value));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Tổng quan hiệu quả content marketing tuần này."
        action={
          <Button
            leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={() => navigate('/content/new')}
          >
            Tạo bài mới
          </Button>
        }
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[116px] w-full rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Bài đăng tuần này"
            value={summary.posts}
            trend={toTrend(summary.trends?.posts)}
          />
          <StatCard
            icon={<ThumbsUp className="h-5 w-5" />}
            label="Tổng tương tác"
            value={summary.engagement.toLocaleString()}
            trend={toTrend(summary.trends?.engagement)}
          />
          <StatCard
            icon={<Video className="h-5 w-5" />}
            label="Video đã tạo"
            value={summary.videos}
          />
          <StatCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Sắp đăng"
            value={summary.scheduled}
          />
        </div>
      )}

      {/* Engagement chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tương tác 7 ngày qua</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : engagement.length === 0 ? (
            <EmptyState
              icon={<ThumbsUp className="h-5 w-5" />}
              title="Chưa có dữ liệu tương tác"
              description="Số liệu sẽ xuất hiện sau khi bài được đăng và đồng bộ tương tác."
            />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={engagement} margin={{ left: -16 }}>
                <defs>
                  <linearGradient id="fillEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#fillEngagement)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--accent))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2 columns */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bài sắp đăng</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[60px] w-full" />
              </>
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Chưa có bài lên lịch"
                description="Tạo bài và đặt lịch để thấy chúng ở đây."
              />
            ) : (
              upcoming.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/content/${post.id}/edit`)}
                  className="flex cursor-pointer items-center gap-3 rounded-button border border-border p-3 transition-colors hover:border-primary"
                >
                  <PlatformBadge platform={post.platform} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-card-title font-semibold">
                      {post.title}
                    </p>
                    <p className="text-label text-muted-foreground">
                      {formatDateTime(post.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              ))
            )}
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
