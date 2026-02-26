/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        parchment: {
          50:  '#fdfbf7',
          100: '#f9f4e8',
          200: '#f0e6cc',
          300: '#e5d4a8',
        },
        ink: {
          900: '#0d0d0f',
          800: '#141418',
          700: '#1c1c22',
          600: '#25252d',
          500: '#32323e',
          400: '#4a4a5a',
          300: '#6b6b82',
          200: '#9898b0',
          100: '#c4c4d4',
        },
        gold: {
          400: '#d4a843',
          500: '#b8902a',
          600: '#9a7520',
        },
        risk: {
          low:      '#22c55e',
          medium:   '#f59e0b',
          high:     '#ef4444',
          critical: '#7c3aed',
        },
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'pulse-slow':  'pulse 3s ease-in-out infinite',
        'spin-slow':   'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
