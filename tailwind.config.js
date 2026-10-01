/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EFF6FF', 600: '#2563EB', 700: '#1D4ED8' },
        bg: '#F5F8FF',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        ink: { 900: '#0F172A', 600: '#475569', 400: '#94A3B8' },
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px', btn: '10px' },
      boxShadow: { card: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(37,99,235,0.06)' },
      maxWidth: { container: '1200px' },
    },
  },
  plugins: [],
};
