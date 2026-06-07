import { FileText } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';

export function ContentPage() {
  return (
    <div>
      <PageHeader
        title="Content"
        description="Quản lý toàn bộ bài đăng đa nền tảng."
        action={<Button>Tạo bài mới</Button>}
      />
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Chưa có bài đăng"
        description="Bảng danh sách + filter + bulk actions sẽ được build ở bước tiếp theo."
        action={<Button variant="secondary">Tạo bài đầu tiên</Button>}
      />
    </div>
  );
}
