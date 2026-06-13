import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Field } from '../../components/ui/Form';
import { Toggle } from '../../components/ui/Choice';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { videoApi, type TaskResponse } from '../../lib/api';

/**
 * Tạo Video: gửi chủ đề → NestJS proxy sang FastAPI → nhận task_id →
 * poll trạng thái mỗi 2 giây cho tới khi xong/lỗi.
 */
export function CreateVideoPage() {
  const [topic, setTopic] = useState('');
  const [aspect, setAspect] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [subtitle, setSubtitle] = useState(true);
  const [task, setTask] = useState<TaskResponse | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dọn interval khi rời trang
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  const isRunning =
    !!task && task.state !== 'complete' && task.state !== 'failed';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTask(null);
    stopPolling();

    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề!');
      return;
    }

    try {
      const created = await videoApi.create({
        topic,
        video_aspect: aspect,
        subtitle_enabled: subtitle,
      });
      setTask(created);

      // Bắt đầu poll tiến độ
      pollRef.current = setInterval(async () => {
        try {
          const t = await videoApi.getTask(created.task_id);
          setTask(t);
          if (t.state === 'complete' || t.state === 'failed') stopPolling();
        } catch {
          /* lỗi tạm thời khi poll → bỏ qua, thử lại lần sau */
        }
      }, 2000);
    } catch (err: unknown) {
      setError('Không tạo được video. Kiểm tra NestJS + FastAPI đã chạy chưa.');
      console.error(err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tạo video"
        description="Nhập chủ đề — hệ thống tự sinh kịch bản → giọng đọc → phụ đề → ghép video."
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Chủ đề video">
            {({ id }) => (
              <Input
                id={id}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Cà phê Việt Nam"
              />
            )}
          </Field>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <Field label="Tỉ lệ khung hình" className="flex-1">
              {({ id }) => (
                <Select
                  id={id}
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value as typeof aspect)}
                >
                  <option value="9:16">9:16 — Dọc (TikTok, Reels)</option>
                  <option value="16:9">16:9 — Ngang (YouTube)</option>
                  <option value="1:1">1:1 — Vuông (Feed)</option>
                </Select>
              )}
            </Field>

            <label className="flex h-10 items-center gap-2.5 rounded-button border border-border bg-muted/40 px-3.5">
              <Toggle
                checked={subtitle}
                onCheckedChange={setSubtitle}
                aria-label="Bật phụ đề"
              />
              <span className="text-body font-medium">Phụ đề</span>
            </label>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="accent"
              loading={isRunning}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              {isRunning ? 'Đang tạo video…' : 'Tạo video'}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-card border border-rose-200 bg-rose-50 p-3.5 text-body text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {task && <ProgressCard task={task} />}
    </div>
  );
}

const STATE_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Đang chờ', cls: 'bg-stone-100 text-stone-600' },
  processing: { label: 'Đang xử lý', cls: 'bg-amber-100/70 text-amber-700' },
  complete: { label: 'Hoàn tất', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Thất bại', cls: 'bg-rose-50 text-rose-700' },
};

function ProgressCard({ task }: { task: TaskResponse }) {
  const meta = STATE_META[task.state] ?? {
    label: task.state,
    cls: 'bg-muted text-muted-foreground',
  };
  const running = task.state !== 'complete' && task.state !== 'failed';

  return (
    <Card className="mt-6 p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-label text-muted-foreground">
          {task.task_id}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-badge font-semibold',
            meta.cls,
          )}
        >
          {running && <Loader2 className="h-3 w-3 animate-spin" />}
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-pill bg-muted">
          <div
            className="h-full rounded-pill bg-accent transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-label font-semibold tabular-nums">
          {task.progress}%
        </span>
      </div>

      {task.message && (
        <p className="mt-3 text-body text-muted-foreground">{task.message}</p>
      )}

      {task.state === 'complete' && task.videos?.[0] && (
        <div className="mt-4 flex items-center gap-2 rounded-button border border-emerald-200 bg-emerald-50 p-3 text-body text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Đã tạo xong: {task.videos[0]}</span>
        </div>
      )}
    </Card>
  );
}
