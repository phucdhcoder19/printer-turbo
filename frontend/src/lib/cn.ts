import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * twMerge mặc định KHÔNG biết các token tuỳ biến của theme dùng chung tiền tố với
 * class chuẩn, nên nó hợp nhất nhầm:
 *   - `text-body` (fontSize) bị coi cùng nhóm với `text-primary-foreground` (màu)
 *     → một trong hai bị bỏ. Vd nút primary mất luôn màu chữ → chữ tối trên nền tối.
 *   - `rounded-button`/`rounded-card` (borderRadius) tương tự.
 * Khai báo chúng vào đúng nhóm để cả size + màu (và radius) đều được giữ.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // Các bo góc tuỳ biến (tailwind.config: button/card/modal/pill)
      borderRadius: ['button', 'card', 'modal', 'pill'],
    },
    classGroups: {
      // Các cỡ chữ tuỳ biến (tailwind.config fontSize) → nhóm font-size, không phải màu
      'font-size': [
        { text: ['title', 'section', 'card-title', 'body', 'label', 'badge'] },
      ],
    },
  },
});

/**
 * Gộp className có điều kiện + tự hợp nhất class Tailwind xung đột.
 * cn('px-2', cond && 'px-4') → 'px-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
