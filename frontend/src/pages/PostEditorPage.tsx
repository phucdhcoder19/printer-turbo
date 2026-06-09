import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Hash, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Field } from '../components/ui/Form';
import { Checkbox } from '../components/ui/Choice';
import { Dropzone } from '../components/ui/Dropzone';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import { postsApi, type CreatePostBody } from '../lib/api';
import { PLATFORMS, type Platform } from '../constants/platforms';

const EDITOR_PLATFORMS: Platform[] = [
  'facebook',
  'tiktok',
  'instagram',
  'youtube',
];

function parseHashtags(value: string): string[] {
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function PostEditorPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [baseCaption, setBaseCaption] = useState('');
  const [active, setActive] = useState<Platform>('facebook');
  const [included, setIncluded] = useState<Set<Platform>>(
    new Set(['facebook']),
  );
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string>>({});
  const [scheduleAt, setScheduleAt] = useState('');
  const [saving, setSaving] = useState(false);

  const activeCaption = captions[active] ?? '';
  const activeTags = tags[active] ?? '';
  const isIncluded = included.has(active);

  function toggleInclude() {
    setIncluded((s) => {
      const next = new Set(s);
      if (next.has(active)) next.delete(active);
      else next.add(active);
      return next;
    });
  }

  function aiWriteCaption() {
    setBaseCaption(
      'Khám phá điều mới mẻ hôm nay ✨ Đừng bỏ lỡ ưu đãi đặc biệt dành riêng cho bạn!',
    );
    toast('success', 'AI đã gợi ý caption');
  }
  function aiSuggestHashtags() {
    setTags((t) => ({ ...t, [active]: '#sale #newproduct #trending' }));
    toast('success', `AI đã gợi ý hashtag cho ${PLATFORMS[active].label}`);
  }

  async function save(mode: 'draft' | 'schedule') {
    if (!title.trim()) {
      toast('error', 'Vui lòng nhập tiêu đề');
      return;
    }
    const platforms = [...included];
    if (platforms.length === 0) {
      toast('error', 'Chọn ít nhất 1 nền tảng để đăng');
      return;
    }
    if (mode === 'schedule' && !scheduleAt) {
      toast('error', 'Chọn thời gian để lên lịch');
      return;
    }

    const scheduledAt =
      mode === 'schedule' ? new Date(scheduleAt).toISOString() : undefined;

    const body: CreatePostBody = {
      title: title.trim(),
      baseCaption: baseCaption.trim() || undefined,
      targets: platforms.map((p) => ({
        platform: p,
        caption: (captions[p] || baseCaption).trim() || undefined,
        hashtags: parseHashtags(tags[p] ?? ''),
        scheduledAt,
      })),
    };

    setSaving(true);
    try {
      await postsApi.create(body);
      toast('success', mode === 'draft' ? 'Đã lưu nháp' : 'Đã lên lịch đăng');
      navigate('/content');
    } catch {
      toast('error', 'Lưu bài thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-20">
      {/* Top bar */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Quay lại"
          onClick={() => navigate('/content')}
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <h1 className="text-title font-display font-bold">Soạn bài đăng</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Cột trái — nội dung gốc */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Field label="Tiêu đề (nội bộ)">
            {({ id }) => (
              <Input
                id={id}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Ra mắt sản phẩm hè"
              />
            )}
          </Field>
          <Field
            label="Caption gốc"
            hint="Mỗi nền tảng có thể chỉnh riêng bên phải"
          >
            {({ id }) => (
              <Textarea
                id={id}
                value={baseCaption}
                onChange={(e) => setBaseCaption(e.target.value)}
                placeholder="Viết nội dung chính..."
                className="min-h-[140px]"
              />
            )}
          </Field>
          <Dropzone hint="PNG, JPG, MP4 — tối đa 100MB" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={aiWriteCaption}
            >
              Viết caption
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Hash className="h-4 w-4" />}
              onClick={aiSuggestHashtags}
            >
              Gợi ý hashtag
            </Button>
          </div>
        </div>

        {/* Cột phải — tuỳ biến từng nền tảng */}
        <div className="lg:col-span-2">
          <div className="rounded-card border border-border bg-card">
            {/* Platform tabs (chấm = đã chọn đăng) */}
            <div className="flex gap-1 border-b border-border p-2">
              {EDITOR_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setActive(p)}
                  title={PLATFORMS[p].label}
                  className={cn(
                    'relative flex flex-1 cursor-pointer items-center justify-center rounded-button py-2 transition-colors',
                    active === p ? 'bg-muted' : 'hover:bg-muted/50',
                  )}
                >
                  <PlatformBadge platform={p} size="sm" />
                  {included.has(p) && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-pill bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 p-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={isIncluded} onChange={toggleInclude} />
                <span className="text-label font-medium">
                  Đăng bài lên {PLATFORMS[active].label}
                </span>
              </label>

              <Field label={`Caption cho ${PLATFORMS[active].label}`}>
                {({ id }) => (
                  <Textarea
                    id={id}
                    value={activeCaption}
                    onChange={(e) =>
                      setCaptions((c) => ({ ...c, [active]: e.target.value }))
                    }
                    placeholder="Để trống = dùng caption gốc"
                  />
                )}
              </Field>
              <Field label="Hashtags">
                {({ id }) => (
                  <Input
                    id={id}
                    value={activeTags}
                    onChange={(e) =>
                      setTags((t) => ({ ...t, [active]: e.target.value }))
                    }
                    placeholder="#sale #trending"
                  />
                )}
              </Field>

              {/* Preview */}
              <div>
                <p className="mb-1 text-label font-medium text-muted-foreground">
                  Xem trước
                </p>
                <div className="overflow-hidden rounded-button border border-border">
                  <div className="flex items-center gap-2 p-3">
                    <PlatformBadge platform={active} size="sm" />
                    <span className="text-label font-semibold">
                      Thương hiệu của bạn
                    </span>
                  </div>
                  <div className="flex h-32 items-center justify-center bg-muted text-label text-muted-foreground">
                    Ảnh / video
                  </div>
                  <p className="p-3 text-body">
                    {activeCaption || baseCaption || 'Caption sẽ hiển thị ở đây...'}
                    {activeTags && (
                      <span className="text-primary"> {activeTags}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-3 lg:px-8">
          <Button
            variant="secondary"
            loading={saving}
            onClick={() => save('draft')}
          >
            Lưu nháp
          </Button>
          <Input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="w-52"
            aria-label="Thời gian đăng"
          />
          <Button loading={saving} onClick={() => save('schedule')}>
            Lên lịch
          </Button>
        </div>
      </div>
    </div>
  );
}
