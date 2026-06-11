import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        parchment: {
          50: '#FDFCF9',
          100: '#FAF9F6',
          200: '#F0EDE6',
          300: '#E0DCD2',
        },
        ink: {
          900: '#1A1A18',
          700: '#3D3D38',
          500: '#6B6960',
          300: '#9B9890',
          100: '#D4D2CB',
        },
        sage: {
          700: '#2D4A2E',
          600: '#3D5A3E',
          500: '#4F7942',
          400: '#6E9B61',
          100: '#E8F0E6',
          50: '#F3F7F2',
        },
        rose: {
          600: '#A14A5E',
          500: '#B85C72',
          100: '#F3E2E6',
        },
        amber: {
          600: '#B8782A',
          500: '#C98F3E',
          100: '#F5E9D6',
        },
      },
      borderRadius: {
        card: '12px',
        sheet: '16px',
        fab: '24px',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [forms],
};
