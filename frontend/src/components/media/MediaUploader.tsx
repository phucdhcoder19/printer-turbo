import { useRef, useState } from 'react';
import { Film, Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { mediaApi, type MediaDto } from '../../lib/api';
import { useToast } from '../ui/Toast';

export function MediaUploader({
  value,
  onChange,
}: {
  value: MediaDto[];
  onChange: (media: MediaDto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: MediaDto[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await mediaApi.upload(file));
      }
      onChange([...value, ...uploaded]);
      toast('success', `Đã tải lên ${uploaded.length} file`);
    } catch {
      toast('error', 'Tải file thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(id: string) {
    onChange(value.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-button border-2 border-dashed border-border px-6 py-8 text-center transition-colors hover:border-primary hover:bg-muted/40',
        )}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-body font-medium">
          {uploading ? 'Đang tải lên...' : 'Kéo thả hoặc bấm để chọn ảnh/video'}
        </p>
        <p className="text-label text-muted-foreground">
          PNG, JPG, MP4 — lưu trên Cloudinary
        </p>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((m) => (
            <div
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-button border border-border bg-muted"
            >
              {m.type === 'video' ? (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Film className="h-6 w-6" />
                </div>
              ) : (
                <img
                  src={m.thumbnailUrl ?? m.url}
                  alt={m.fileName ?? 'media'}
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label="Xoá"
                className="absolute right-1 top-1 cursor-pointer rounded-pill bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
