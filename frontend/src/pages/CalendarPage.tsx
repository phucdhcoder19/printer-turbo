import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/Feedback';

export function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Lên lịch đăng bài theo tuần và tháng."
      />
      <EmptyState
        icon={<CalendarDays className="h-5 w-5" />}
        title="Calendar đang được xây dựng"
        description="Week/month view + kéo-thả bài đăng sẽ có ở bước tiếp theo."
      />
    </div>
  );
}
