import { useEffect, useState } from 'react';
import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { Segmented } from '../components/ui/Segmented';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { EmptyState, Skeleton } from '../components/ui/Feedback';
import {
  analyticsApi,
  type AnalyticsRange,
  type EngagementPoint,
  type PlatformStat,
  type TopPost,
} from '../lib/api';
import { MOCK_AI_INSIGHTS } from '../constants/mock';
import { PLATFORMS } from '../constants/platforms';

// Tooltip nhất quán theo theme
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
  boxShadow: '0 8px 28px -8px rgb(28 25 23 / 0.20)',
};
const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [engagement, setEngagement] = useState<EngagementPoint[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // allSettled: endpoint nào chưa có (BE đang làm) thì phần đó để rỗng, không vỡ trang.
    Promise.allSettled([
      analyticsApi.byPlatform(range),
      analyticsApi.engagement(range),
      analyticsApi.topPosts(range),
    ])
      .then(([p, e, t]) => {
        setPlatformStats(p.status === 'fulfilled' && Array.isArray(p.value) ? p.value : []);
        setEngagement(e.status === 'fulfilled' && Array.isArray(e.value) ? e.value : []);
        setTopPosts(t.status === 'fulfilled' && Array.isArray(t.value) ? t.value : []);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const barData = platformStats.map((s) => ({
    name: PLATFORMS[s.platform].label,
    engagement: s.engagement,
    color: PLATFORMS[s.platform].color,
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Hiệu quả bài đăng theo nền tảng."
        action={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: '7 ngày' },
              { value: '30d', label: '30 ngày' },
              { value: '90d', label: '90 ngày' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar: so sánh nền tảng */}
        <Card>
          <CardHeader>
            <CardTitle>Tương tác theo nền tảng</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : barData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="h-5 w-5" />}
                title="Chưa có dữ liệu"
                description="Số liệu xuất hiện khi bài đã đăng và được đồng bộ tương tác."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ left: -16 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
                    {barData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line: tương tác theo thời gian */}
        <Card>
          <CardHeader>
            <CardTitle>Tương tác theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : engagement.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-5 w-5" />}
                title="Chưa có dữ liệu"
                description="Chưa có tương tác trong khoảng thời gian này."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={engagement} margin={{ left: -16 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--accent))' }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top posts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bài đăng nổi bật</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {loading ? (
              <div className="flex flex-col gap-2 px-5 pb-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : topPosts.length === 0 ? (
              <div className="px-5 pb-5">
                <EmptyState
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Chưa có bài nổi bật"
                  description="Khi có tương tác, các bài hiệu quả nhất sẽ hiện ở đây."
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-10">#</TH>
                    <TH>Bài đăng</TH>
                    <TH>Nền tảng</TH>
                    <TH className="text-right">Tương tác</TH>
                  </TR>
                </THead>
                <TBody>
                  {topPosts.map((p, i) => (
                    <TR key={p.id}>
                      <TD className="text-muted-foreground">{i + 1}</TD>
                      <TD className="font-medium">{p.title}</TD>
                      <TD>
                        <PlatformBadge platform={p.platform} size="sm" />
                      </TD>
                      <TD className="text-right tabular-nums">
                        {p.engagement.toLocaleString()}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* AI insights — còn dùng dữ liệu mẫu, sẽ nối API thật ở tính năng AI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {MOCK_AI_INSIGHTS.map((insight, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                <p className="text-body text-muted-foreground">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
