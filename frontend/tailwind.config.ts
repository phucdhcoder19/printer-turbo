import type { Config } from 'tailwindcss';

/**
 * Design tokens cho Marketing Hub.
 * Màu dùng CSS variables (HSL) để hỗ trợ dark mode class-based.
 * Components dùng `bg-primary`, `text-foreground`... thay vì hardcode hex.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme tokens (đổi theo light/dark qua CSS vars)
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        // Điểm nhấn hổ phách (AI, highlight, focus ring)
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        // Màu nền tảng (cố định, không đổi theo theme)
        platform: {
          facebook: '#1877F2',
          tiktok: '#010101',
          instagram: '#E4405F',
          youtube: '#FF0000',
        },
      },
      fontFamily: {
        // Body mặc định
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Heading/tiêu đề (class `font-display`): serif hiện đại Fraunces
        // → chất "tạp chí/biên tập", cao cấp, rời xa look SaaS-AI mặc định.
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      // Thang font nhất quán (chỉ size + line-height; weight áp riêng để tránh
      // xung đột khi kết hợp với font-medium/semibold).
      // Quy ước weight theo vai trò:
      //   title 700 · section 600 · card-title 600 · body 400 · label 500 · badge 600
      fontSize: {
        title: ['24px', { lineHeight: '32px' }],
        section: ['18px', { lineHeight: '28px' }],
        'card-title': ['15px', { lineHeight: '22px' }],
        body: ['14px', { lineHeight: '20px' }],
        label: ['12px', { lineHeight: '16px' }],
        badge: ['11px', { lineHeight: '14px' }],
      },
      borderRadius: {
        button: '10px',
        card: '14px',
        modal: '18px',
        pill: '9999px',
      },
      // Shadow tông ấm (stone) + nhiều lớp → mềm, có chiều sâu, không "phẳng AI"
      boxShadow: {
        card: '0 1px 2px -1px rgb(28 25 23 / 0.06), 0 4px 12px -4px rgb(28 25 23 / 0.08)',
        'card-hover':
          '0 2px 4px -2px rgb(28 25 23 / 0.08), 0 12px 28px -8px rgb(28 25 23 / 0.14)',
        modal: '0 24px 60px -16px rgb(28 25 23 / 0.34)',
        dropdown: '0 8px 28px -8px rgb(28 25 23 / 0.20)',
      },
      zIndex: {
        // Thang z-index rõ ràng (theo UX guideline)
        dropdown: '10',
        sticky: '20',
        topbar: '30',
        modal: '50',
        toast: '60',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
