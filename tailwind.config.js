/** @type {import('tailwindcss').Config} */
// Design tokens. Source of truth for prose: DESIGN.md (repo root).
// Class and severity colors are NOT here; they live in src/shared/constants/classes.ts.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB', // vital clinical blue: CTA, active nav, focus
          700: '#1D4ED8', // hover / pressed
          800: '#1E40AF', // disclaimer text
          900: '#1E3A8A',
        },
        canvas: '#FFFFFF', // page background
        tint: '#F5F8FF', // ice-blue wash: inset panels, upload zone, soft sections
        bg: '#F5F8FF', // legacy alias of tint
        surface: '#FFFFFF',
        border: { DEFAULT: '#E2E8F0', strong: '#CBD5E1' },
        ink: {
          900: '#0F172A', // primary text
          700: '#334155',
          600: '#475569', // body text
          500: '#64748B', // muted: metadata, captions (4.7:1 on white)
          400: '#94A3B8', // placeholder / decorative only, fails text contrast
        },
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        display: ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-xl-sm': ['1.625rem', { lineHeight: '2.125rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'headline-sm': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.625rem' }],
        'body-md': ['0.875rem', { lineHeight: '1.375rem' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem' }],
        'label-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '500' }],
        caption: ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.02em', fontWeight: '500' }],
      },
      spacing: {
        gutter: '1.5rem', // grid gutter and gap between analysis widgets (desktop)
        'gutter-sm': '1rem', // mobile gutter / margin
        'gutter-md': '1.25rem', // tablet gutter
        margin: '2rem', // desktop screen margin
        'margin-md': '1.5rem', // tablet screen margin
      },
      borderRadius: {
        control: '8px', // inputs, checkboxes, tooltips, thumbnails
        btn: '12px', // buttons, chips, dropdowns
        card: '16px', // cards, viewports, modals, drop zones
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(15,23,42,0.04), 0 2px 6px -1px rgba(15,23,42,0.02)', // 2dp
        float: '0 12px 32px -4px rgba(15,23,42,0.08), 0 4px 12px -2px rgba(15,23,42,0.03)', // 3dp
        focus: '0 0 0 3px rgba(37,99,235,0.25)', // buttons
        'focus-soft': '0 0 0 3px rgba(37,99,235,0.15)', // inputs
      },
      maxWidth: { container: '1280px' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [],
};
