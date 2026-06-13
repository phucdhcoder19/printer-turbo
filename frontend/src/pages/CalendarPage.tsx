import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { Skeleton } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import { postsApi, type PostDto } from '../lib/api';
import type { Platform } from '../constants/platforms';
import { STATUS_CONFIG, type PostStatus } from '../constants/statuses';

type ViewMode = 'week' | 'month';
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface CalEvent {
  id: string;
  postId: string; // để mở trang sửa bài khi bấm event
  title: string;
  platform: Platform;
  status: PostStatus; // trạng thái của target → chấm màu trên chip
  date: Date;
  time: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
// Thứ 2 đầu tuần
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Mỗi post_target → 1 sự kiện trên lịch.
// Bài ĐÃ đăng hiện theo ngày đăng thật (publishedAt); bài CHƯA đăng (đã lên lịch)
// hiện theo ngày dự kiến (scheduledAt). Không có cả hai (bản nháp) → bỏ qua.
function toEvents(posts: PostDto[]): CalEvent[] {
  const events: CalEvent[] = [];
  for (const p of posts) {
    for (const t of p.targets) {
      const when = t.publishedAt ?? t.scheduledAt;
      if (!when) continue;
      const date = new Date(when);
      events.push({
        id: t.id,
        postId: p.id,
        title: p.title,
        platform: t.platform,
        status: t.status,
        date,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
      });
    }
  }
  return events;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    postsApi
      .list()
      .then(setPosts)
      .catch(() => toast('error', 'Không tải được lịch'))
      .finally(() => setLoading(false));
  }, [toast]);

  const events = useMemo(() => toEvents(posts), [posts]);
  const today = new Date();

  function shift(dir: number) {
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * 7)));
  }

  const periodLabel =
    view === 'month'
      ? `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`
      : (() => {
          const s = startOfWeek(cursor);
          const e = addDays(s, 6);
          return `${pad(s.getDate())}/${pad(s.getMonth() + 1)} – ${pad(
            e.getDate(),
          )}/${pad(e.getMonth() + 1)}`;
        })();

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={periodLabel}
        action={
          <div className="flex items-center gap-3">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'week', label: 'Tuần' },
                { value: 'month', label: 'Tháng' },
              ]}
            />
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/content/new')}
            >
              Tạo bài
            </Button>
          </div>
        }
      />

      {/* Toolbar điều hướng */}
      <div className="mb-4 flex items-center gap-2">
        <div className="inline-flex items-center rounded-button border border-border bg-card shadow-sm">
          <button
            type="button"
            aria-label="Trước"
            onClick={() => shift(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-l-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <span className="h-5 w-px bg-border" />
          <button
            type="button"
            aria-label="Sau"
            onClick={() => shift(1)}
            className="flex h-9 w-9 items-center justify-center rounded-r-button text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          Hôm nay
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : view === 'month' ? (
        <MonthView
          cursor={cursor}
          today={today}
          events={events}
          onOpen={(postId) => navigate(`/content/${postId}/edit`)}
        />
      ) : (
        <WeekView
          cursor={cursor}
          today={today}
          events={events}
          onOpen={(postId) => navigate(`/content/${postId}/edit`)}
        />
      )}
    </div>
  );
}

function MonthView({
  cursor,
  today,
  events,
  onOpen,
}: {
  cursor: Date;
  today: Date;
  events: CalEvent[];
  onOpen: (postId: string) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const MAX_VISIBLE = 3;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground',
              i >= 5 && 'text-muted-foreground/60',
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const date = day ? new Date(year, month, day) : null;
          const isToday = date ? sameDay(date, today) : false;
          const isWeekend = i % 7 >= 5;
          const dayEvents = date
            ? events.filter((e) => sameDay(e.date, date))
            : [];
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const extra = dayEvents.length - visible.length;
          return (
            <div
              key={i}
              className={cn(
                'min-h-[124px] border-b border-r border-border p-1.5 transition-colors',
                (i + 1) % 7 === 0 && 'border-r-0',
                !day && 'bg-muted/20',
                isWeekend && day && 'bg-muted/[0.15]',
                isToday && 'bg-accent/[0.06]',
              )}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-6 items-center justify-center rounded-pill px-1.5 text-label tabular-nums',
                      isToday
                        ? 'bg-accent font-semibold text-accent-foreground shadow-sm'
                        : 'font-medium text-muted-foreground',
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {visible.map((e) => (
                      <EventChip key={e.id} event={e} onOpen={onOpen} showTime />
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpen(dayEvents[MAX_VISIBLE].postId)}
                        className="w-full rounded-[7px] px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        +{extra} bài nữa
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  cursor,
  today,
  events,
  onOpen,
}: {
  cursor: Date;
  today: Date;
  events: CalEvent[];
  onOpen: (postId: string) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((date, idx) => {
        const isToday = sameDay(date, today);
        const isWeekend = idx >= 5;
        const dayEvents = events.filter((e) => sameDay(e.date, date));
        return (
          <div
            key={idx}
            className={cn(
              'flex min-h-[160px] flex-col rounded-card border bg-card p-2 shadow-card transition-colors',
              isToday
                ? 'border-accent/40 ring-1 ring-accent/30'
                : 'border-border',
            )}
          >
            <div
              className={cn(
                'mb-2 flex items-center justify-between rounded-[9px] px-2 py-1.5',
                isToday && 'bg-accent/[0.07]',
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.08em]',
                  isWeekend
                    ? 'text-muted-foreground/60'
                    : 'text-muted-foreground',
                )}
              >
                {WEEKDAYS[idx]}
              </span>
              <span
                className={cn(
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-pill px-1.5 text-label tabular-nums',
                  isToday
                    ? 'bg-accent font-semibold text-accent-foreground shadow-sm'
                    : 'font-medium text-foreground',
                )}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="flex-1 space-y-1">
              {dayEvents.length === 0 ? (
                <p className="px-1 pt-1 text-[11px] text-muted-foreground/50">
                  Trống
                </p>
              ) : (
                dayEvents.map((e) => (
                  <EventChip key={e.id} event={e} onOpen={onOpen} showTime />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventChip({
  event,
  showTime,
  onOpen,
}: {
  event: CalEvent;
  showTime?: boolean;
  onOpen: (postId: string) => void;
}) {
  const status = STATUS_CONFIG[event.status];
  return (
    <button
      type="button"
      onClick={() => onOpen(event.postId)}
      title={`${event.title} • ${status.label} • ${event.time} — bấm để sửa`}
      className="flex w-full cursor-pointer items-center gap-1.5 rounded-[8px] border border-transparent bg-muted/50 px-1.5 py-1 text-left text-[11px] transition-all hover:border-border hover:bg-card hover:shadow-sm"
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-pill', status.dot)}
        aria-hidden
      />
      <PlatformBadge
        platform={event.platform}
        size="sm"
        className="h-4 w-4 rounded-[5px] text-[8px]"
      />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {event.title}
      </span>
      {showTime && (
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {event.time}
        </span>
      )}
    </button>
  );
}
