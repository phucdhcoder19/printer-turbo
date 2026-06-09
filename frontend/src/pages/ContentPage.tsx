import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Checkbox } from '../components/ui/Choice';
import { StatusBadge } from '../components/ui/Badge';
import { PlatformBadge } from '../components/ui/PlatformBadge';
import { Table, TBody, TD, TH, THead, TR } from '../components/ui/Table';
import { Skeleton } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { postsApi, type PostDto } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { PLATFORM_LIST, PLATFORMS, type Platform } from '../constants/platforms';

function engagementOf(post: PostDto): number {
  return post.targets.reduce(
    (sum, t) =>
      sum + t.currentLikes + t.currentComments + t.currentShares,
    0,
  );
}

function dateOf(post: PostDto): string {
  const scheduled = post.targets
    .map((t) => t.scheduledAt)
    .filter((d): d is string => !!d)
    .sort()[0];
  return scheduled ? formatDateTime(scheduled) : formatDateTime(post.createdAt);
}

function platformsOf(post: PostDto): Platform[] {
  return [...new Set(post.targets.map((t) => t.platform))];
}

export function ContentPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    postsApi
      .list()
      .then(setPosts)
      .catch(() => toast('error', 'Không tải được danh sách bài đăng'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = posts.filter(
    (p) =>
      (platform === 'all' ||
        p.targets.some((t) => t.platform === platform)) &&
      (status === 'all' || p.status === status) &&
      p.title.toLowerCase().includes(q.toLowerCase()),
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function deleteSelected() {
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => postsApi.remove(id)));
      toast('success', `Đã xoá ${selected.size} bài`);
      setSelected(new Set());
      load();
    } catch {
      toast('error', 'Xoá thất bại');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Content"
        description="Quản lý toàn bộ bài đăng đa nền tảng."
        action={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/content/new')}
          >
            Tạo bài mới
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tiêu đề..."
            className="pl-9"
          />
        </div>
        <Select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-44"
        >
          <option value="all">Tất cả nền tảng</option>
          {PLATFORM_LIST.map((p) => (
            <option key={p} value={p}>
              {PLATFORMS[p].label}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="publishing">Publishing</option>
          <option value="published">Published</option>
          <option value="partially_failed">Partial</option>
          <option value="failed">Failed</option>
        </Select>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <Checkbox checked={allChecked} onChange={toggleAll} />
                </TH>
                <TH>Bài đăng</TH>
                <TH>Nền tảng</TH>
                <TH>Trạng thái</TH>
                <TH>Lịch</TH>
                <TH className="text-right">Tương tác</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Checkbox
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                  </TD>
                  <TD className="font-medium">{p.title}</TD>
                  <TD>
                    <div className="flex gap-1">
                      {platformsOf(p).map((pf) => (
                        <PlatformBadge key={pf} platform={pf} size="sm" />
                      ))}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={p.status} />
                  </TD>
                  <TD className="text-muted-foreground">{dateOf(p)}</TD>
                  <TD className="text-right tabular-nums">
                    {engagementOf(p).toLocaleString()}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-10 text-center text-body text-muted-foreground">
            {posts.length === 0
              ? 'Chưa có bài đăng nào. Bấm "Tạo bài mới" để bắt đầu.'
              : 'Không có bài nào khớp bộ lọc.'}
          </div>
        )}
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between rounded-button border border-border bg-card p-3 shadow-modal">
          <span className="text-body font-medium">
            Đã chọn {selected.size} bài
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={deleteSelected}
            >
              Xoá
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
