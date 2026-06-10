import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Hash, Send, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Field } from '../components/ui/Form';
import { Checkbox } from '../components/ui/Choice';
import { RichTextEditor } from '../components/editor/RichTextEditor';
import { MediaUploader } from '../components/media/MediaUploader';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/cn';
import {
  postsApi,
  type CreatePostBody,
  type MediaDto,
  type PostDto,
} from '../lib/api';
import { PLATFORMS, type Platform } from '../constants/platforms';

// Nền tảng có thể chọn trong editor (wordpress + facebook đăng thật được).
const EDITOR_PLATFORMS: Platform[] = [
  'facebook',
  'wordpress',
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

// HTML → text thuần (caption nền tảng + xem trước)
function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').trim();
}

// ISO → giá trị cho <input type="datetime-local"> (giờ local)
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function PostEditorPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const editing = !!id;

  const [loadingPost, setLoadingPost] = useState(editing);
  const [title, setTitle] = useState('');
  const [baseCaption, setBaseCaption] = useState('');
  const [media, setMedia] = useState<MediaDto[]>([]);
  const [active, setActive] = useState<Platform>('facebook');
  const [included, setIncluded] = useState<Set<Platform>>(
    new Set(['facebook']),
  );
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string>>({});
  const [scheduleAt, setScheduleAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Sửa bài: load bài cũ rồi điền sẵn form
  useEffect(() => {
    if (!id) return;
    setLoadingPost(true);
    postsApi
      .get(id)
      .then((post) => {
        setTitle(post.title);
        setBaseCaption(post.baseCaption ?? '');
        setMedia(
          [...post.media]
            .sort((a, b) => a.position - b.position)
            .map((pm) => pm.media),
        );
        setIncluded(new Set(post.targets.map((t) => t.platform)));
        const caps: Record<string, string> = {};
        const tgs: Record<string, string> = {};
        let sched = '';
        for (const t of post.targets) {
          caps[t.platform] = t.caption ?? '';
          tgs[t.platform] = t.hashtags.join(' ');
          if (!sched && t.scheduledAt) sched = toDatetimeLocal(t.scheduledAt);
        }
        setCaptions(caps);
        setTags(tgs);
        setScheduleAt(sched);
        if (post.targets[0]) setActive(post.targets[0].platform);
      })
      .catch(() => toast('error', 'Không tải được bài đăng'))
      .finally(() => setLoadingPost(false));
  }, [id, toast]);

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

  /**
   * Lưu bài (create/update) và trả về post đã lưu. Không toast/không điều hướng
   * để dùng lại cho cả "lưu" lẫn "đăng ngay". Trả null nếu form chưa hợp lệ.
   */
  async function persist(scheduledAt?: string): Promise<PostDto | null> {
    if (!title.trim()) {
      toast('error', 'Vui lòng nhập tiêu đề');
      return null;
    }
    const platforms = [...included];
    if (platforms.length === 0) {
      toast('error', 'Chọn ít nhất 1 nền tảng để đăng');
      return null;
    }

    const body: CreatePostBody = {
      title: title.trim(),
      baseCaption: baseCaption.trim() || undefined,
      mediaIds: media.map((m) => m.id),
      targets: platforms.map((p) => ({
        platform: p,
        // caption nền tảng là TEXT thuần (override) hoặc text của nội dung
        caption: captions[p] || htmlToText(baseCaption) || undefined,
        hashtags: parseHashtags(tags[p] ?? ''),
        scheduledAt,
      })),
    };

    return editing && id ? postsApi.update(id, body) : postsApi.create(body);
  }

  async function save(mode: 'draft' | 'schedule') {
    if (mode === 'schedule' && !scheduleAt) {
      toast('error', 'Chọn thời gian để lên lịch');
      return;
    }
    const scheduledAt =
      mode === 'schedule' ? new Date(scheduleAt).toISOString() : undefined;

    setSaving(true);
    try {
      const post = await persist(scheduledAt);
      if (!post) return;
      toast(
        'success',
        editing
          ? 'Đã cập nhật bài'
          : mode === 'draft'
            ? 'Đã lưu nháp'
            : 'Đã lên lịch đăng',
      );
      navigate('/content');
    } catch {
      toast('error', 'Lưu bài thất bại');
    } finally {
      setSaving(false);
    }
  }

  // Đăng NGAY: lưu trước (không lịch) → gọi publish → tổng hợp kết quả.
  async function publishNow() {
    setPublishing(true);
    try {
      const saved = await persist();
      if (!saved) return;
      const post = await postsApi.publish(saved.id);
      const ok = post.targets.filter((t) => t.status === 'published');
      const failed = post.targets.filter((t) => t.status === 'failed');

      if (failed.length === 0) {
        toast('success', `Đã đăng lên ${ok.length} nền tảng 🎉`);
      } else if (ok.length === 0) {
        toast(
          'error',
          `Đăng thất bại: ${failed
            .map((f) => `${PLATFORMS[f.platform].label} (${f.errorMessage})`)
            .join('; ')}`,
        );
      } else {
        toast(
          'info',
          `Đăng ${ok.length}/${post.targets.length} nền tảng. Lỗi: ${failed
            .map((f) => PLATFORMS[f.platform].label)
            .join(', ')}`,
        );
      }
      navigate('/content');
    } catch {
      toast('error', 'Đăng bài thất bại');
    } finally {
      setPublishing(false);
    }
  }

  if (loadingPost) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  const busy = saving || publishing;

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
        <h1 className="text-title font-display font-bold">
          {editing ? 'Sửa bài đăng' : 'Soạn bài đăng'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Cột trái — nội dung gốc */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Field label="Tiêu đề (nội bộ / tiêu đề bài WordPress)">
            {({ id: fid }) => (
              <Input
                id={fid}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Ra mắt sản phẩm hè"
              />
            )}
          </Field>
          <div>
            <p className="mb-1 text-label font-medium text-muted-foreground">
              Nội dung bài viết
            </p>
            <RichTextEditor value={baseCaption} onChange={setBaseCaption} />
            <p className="mt-1 text-label text-muted-foreground">
              In đậm/nghiêng, căn lề, chèn ảnh giữa nội dung. Mỗi nền tảng có thể
              chỉnh caption riêng bên phải.
            </p>
          </div>

          <div>
            <p className="mb-1 text-label font-medium text-muted-foreground">
              Ảnh / video đính kèm
            </p>
            <MediaUploader value={media} onChange={setMedia} />
            <p className="mt-1 text-label text-muted-foreground">
              Dùng để đăng ảnh/video lên Facebook. WordPress lấy ảnh đầu làm ảnh
              đại diện.
            </p>
          </div>

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
                {({ id: fid }) => (
                  <Textarea
                    id={fid}
                    value={activeCaption}
                    onChange={(e) =>
                      setCaptions((c) => ({ ...c, [active]: e.target.value }))
                    }
                    placeholder="Để trống = dùng caption gốc"
                  />
                )}
              </Field>

              {active === 'wordpress' ? (
                <p className="text-label text-muted-foreground">
                  WordPress đăng theo <b>tiêu đề</b> + <b>nội dung bài viết</b>{' '}
                  (HTML bên trái). Hashtag không áp dụng cho WordPress.
                </p>
              ) : (
                <Field label="Hashtags">
                  {({ id: fid }) => (
                    <Input
                      id={fid}
                      value={activeTags}
                      onChange={(e) =>
                        setTags((t) => ({ ...t, [active]: e.target.value }))
                      }
                      placeholder="#sale #trending"
                    />
                  )}
                </Field>
              )}

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
                  {media[0] ? (
                    media[0].type === 'video' ? (
                      <video
                        src={media[0].url}
                        className="h-32 w-full bg-black object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={media[0].thumbnailUrl ?? media[0].url}
                        alt="preview"
                        className="h-32 w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-muted text-label text-muted-foreground">
                      Ảnh / video
                    </div>
                  )}
                  <p className="p-3 text-body">
                    {activeCaption ||
                      htmlToText(baseCaption) ||
                      'Caption sẽ hiển thị ở đây...'}
                    {activeTags && active !== 'wordpress' && (
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-6 py-3 lg:px-8">
          <Button
            variant="ghost"
            loading={saving}
            disabled={busy}
            onClick={() => save('draft')}
          >
            {editing ? 'Lưu thay đổi' : 'Lưu nháp'}
          </Button>
          <Input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="w-52"
            aria-label="Thời gian đăng"
          />
          <Button
            variant="secondary"
            loading={saving}
            disabled={busy}
            onClick={() => save('schedule')}
          >
            Lên lịch
          </Button>
          <Button
            loading={publishing}
            disabled={busy}
            leftIcon={<Send className="h-4 w-4" />}
            onClick={publishNow}
          >
            Đăng ngay
          </Button>
        </div>
      </div>
    </div>
  );
}
