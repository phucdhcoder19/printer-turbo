import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { cn } from '../lib/cn';
import { MOCK_CALENDAR_EVENTS, type CalendarEvent } from '../constants/mock';

type ViewMode = 'week' | 'month';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
// Demo cố định: tháng 6/2026, "hôm nay" = ngày 7
const YEAR = 2026;
const MONTH = 5; // June (0-indexed)
const TODAY = 7;

function eventsOfDay(day: number): CalendarEvent[] {
  return MOCK_CALENDAR_EVENTS.filter((e) => e.day === day);
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('month');

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Tháng 6, 2026"
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

      {view === 'month' ? <MonthView /> : <WeekView />}
    </div>
  );
}

function MonthView() {
  const firstWeekday = new Date(YEAR, MONTH, 1).getDay(); // 0=CN
  const offset = (firstWeekday + 6) % 7; // đổi sang Thứ 2 đầu tuần
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      {/* Header thứ */}
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
      {/* Lưới ngày */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
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
                    day === TODAY
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {eventsOfDay(day).map((e) => (
                    <EventChip key={e.id} event={e} />
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView() {
  const weekDays = [8, 9, 10, 11, 12, 13, 14]; // demo: tuần thứ 2 của tháng
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {weekDays.map((day, idx) => (
        <div
          key={day}
          className="rounded-card border border-border bg-card p-2"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-label font-semibold text-muted-foreground">
              {WEEKDAYS[idx]}
            </span>
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-pill text-label',
                day === TODAY && 'bg-primary font-semibold text-primary-foreground',
              )}
            >
              {day}
            </span>
          </div>
          <div className="space-y-1">
            {eventsOfDay(day).map((e) => (
              <EventChip key={e.id} event={e} showTime />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventChip({
  event,
  showTime,
}: {
  event: CalendarEvent;
  showTime?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-[6px] border border-border bg-background p-1.5 text-[11px] transition-colors hover:border-primary">
      <PlatformBadge platform={event.platform} size="sm" className="h-4 w-4 text-[8px]" />
      <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
      {showTime && <span className="text-muted-foreground">{event.time}</span>}
    </div>
  );
}
