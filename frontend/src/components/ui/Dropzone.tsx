import { UploadCloud } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Vùng kéo-thả upload (hiện chỉ phần nhìn — chưa nối upload thật). */
export function Dropzone({
  hint,
  className,
}: {
  hint?: string;
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-button border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary hover:bg-muted/40',
        className,
      )}
    >
      <UploadCloud className="h-6 w-6 text-muted-foreground" />
      <p className="text-body font-medium">Kéo thả ảnh/video vào đây</p>
      <p className="text-label text-muted-foreground">
        {hint ?? 'hoặc bấm để chọn file'}
      </p>
    </div>
  );
}
