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

type ViewMode = 'week' | 'month';
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface CalEvent {
  id: string;
  title: string;
  platform: Platform;
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

// Mỗi post_target có scheduledAt → 1 sự kiện trên lịch
function toEvents(posts: PostDto[]): CalEvent[] {
  const events: CalEvent[] = [];
  for (const p of posts) {
    for (const t of p.targets) {
      if (!t.scheduledAt) continue;
      const date = new Date(t.scheduledAt);
      events.push({
        id: t.id,
        title: p.title,
        platform: t.platform,
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
      <div className="mb-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Trước"
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          Hôm nay
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sau"
          onClick={() => shift(1)}
        >
          <ChevronRight className="h-[18px] w-[18px]" />
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : view === 'month' ? (
        <MonthView cursor={cursor} today={today} events={events} />
      ) : (
        <WeekView cursor={cursor} today={today} events={events} />
      )}
    </div>
  );
}

function MonthView({
  cursor,
  today,
  events,
}: {
  cursor: Date;
  today: Date;
  events: CalEvent[];
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-label font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const date = day ? new Date(year, month, day) : null;
          const isToday = date ? sameDay(date, today) : false;
          const dayEvents = date
            ? events.filter((e) => sameDay(e.date, date))
            : [];
          return (
            <div
              key={i}
              className={cn(
                'min-h-[110px] border-b border-r border-border p-1.5',
                (i + 1) % 7 === 0 && 'border-r-0',
              )}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-pill text-label',
                      isToday
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((e) => (
                      <EventChip key={e.id} event={e} />
                    ))}
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
}: {
  cursor: Date;
  today: Date;
  events: CalEvent[];
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((date, idx) => {
        const isToday = sameDay(date, today);
        const dayEvents = events.filter((e) => sameDay(e.date, date));
        return (
          <div key={idx} className="rounded-card border border-border bg-card p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-label font-semibold text-muted-foreground">
                {WEEKDAYS[idx]}
              </span>
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-pill text-label',
                  isToday && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <p className="px-1 text-[11px] text-muted-foreground">—</p>
              ) : (
                dayEvents.map((e) => <EventChip key={e.id} event={e} showTime />)
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
}: {
  event: CalEvent;
  showTime?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-[6px] border border-border bg-background p-1.5 text-[11px] transition-colors hover:border-primary">
      <PlatformBadge
        platform={event.platform}
        size="sm"
        className="h-4 w-4 text-[8px]"
      />
      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
      {showTime && <span className="text-muted-foreground">{event.time}</span>}
    </div>
  );
}
