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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        button: '8px',
        card: '12px',
        modal: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.04)',
        modal: '0 16px 48px -12px rgb(15 23 42 / 0.30)',
        dropdown: '0 8px 24px -8px rgb(15 23 42 / 0.18)',
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
