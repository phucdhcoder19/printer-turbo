import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { mediaApi } from '../../lib/api';
import { useToast } from '../ui/Toast';

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Viết nội dung bài đăng...',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'min-h-[180px] leading-relaxed focus:outline-none' },
    },
  });

  // Đồng bộ khi value đổi từ ngoài (nút AI, load bài cũ khi sửa)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  async function insertImage(files: FileList | null) {
    if (!files?.[0] || !editor) return;
    setUploading(true);
    try {
      const m = await mediaApi.upload(files[0]);
      editor.chain().focus().setImage({ src: m.url, alt: m.fileName ?? '' }).run();
    } catch {
      toast('error', 'Chèn ảnh thất bại');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!editor) return null;

  return (
    <div className="rounded-button border border-input bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
        <TBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Đậm"
        >
          <Bold className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Nghiêng"
        >
          <Italic className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="Gạch chân"
        >
          <UnderlineIcon className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Tiêu đề"
        >
          <Heading2 className="h-4 w-4" />
        </TBtn>

        <Divider />

        <TBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Danh sách"
        >
          <List className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Danh sách số"
        >
          <ListOrdered className="h-4 w-4" />
        </TBtn>

        <Divider />

        <TBtn
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          label="Căn trái"
        >
          <AlignLeft className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          label="Căn giữa"
        >
          <AlignCenter className="h-4 w-4" />
        </TBtn>
        <TBtn
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          label="Căn phải"
        >
          <AlignRight className="h-4 w-4" />
        </TBtn>

        <Divider />

        <TBtn onClick={() => fileRef.current?.click()} label="Chèn ảnh">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </TBtn>
      </div>

      <EditorContent editor={editor} className="px-3 py-2 text-body" />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => insertImage(e.target.files)}
      />
    </div>
  );
}

function TBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" />;
}
