import { Video } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';

export function VideosListPage() {
  return (
    <div>
      <PageHeader
        title="Danh sách video"
        description="Các video đã tạo từ pipeline."
        action={<Button>Tạo video</Button>}
      />
      <EmptyState
        icon={<Video className="h-5 w-5" />}
        title="Chưa có video nào"
        description="Vào 'Tạo video' để sinh video ngắn tự động."
      />
    </div>
  );
}
