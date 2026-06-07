import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/Feedback';

export function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Hiệu quả bài đăng theo nền tảng."
      />
      <EmptyState
        icon={<BarChart3 className="h-5 w-5" />}
        title="Chưa có dữ liệu"
        description="Biểu đồ so sánh nền tảng + top bài đăng + AI insights sẽ có ở bước tiếp theo."
      />
    </div>
  );
}
