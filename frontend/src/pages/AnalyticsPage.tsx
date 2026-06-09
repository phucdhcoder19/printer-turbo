import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
import {
  MOCK_AI_INSIGHTS,
  MOCK_ENGAGEMENT_7D,
  MOCK_PLATFORM_STATS,
  MOCK_TOP_POSTS,
} from '../constants/mock';
import { PLATFORMS } from '../constants/platforms';

type Range = '7d' | '30d' | '90d';

// Tooltip nhất quán theo theme
const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  fontSize: 12,
  boxShadow: '0 8px 24px -8px rgb(15 23 42 / 0.18)',
};
const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

export function AnalyticsPage() {
  const [range, setRange] = useState<Range>('7d');

  const barData = MOCK_PLATFORM_STATS.map((s) => ({
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
          </CardContent>
        </Card>

        {/* Line: tương tác theo thời gian */}
        <Card>
          <CardHeader>
            <CardTitle>Tương tác theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={MOCK_ENGAGEMENT_7D} margin={{ left: -16 }}>
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
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
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
                {MOCK_TOP_POSTS.map((p, i) => (
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
          </CardContent>
        </Card>

        {/* AI insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {MOCK_AI_INSIGHTS.map((insight, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-primary" />
                <p className="text-body text-muted-foreground">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
