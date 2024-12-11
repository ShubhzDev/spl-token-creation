/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        background: 'var(--color-background)',
        card: 'var(--color-card)',
      },
      fontSize: {
        'heading-1': '24px',
        'heading-2': '20px',
        'heading-3': '16px',
        'body': '14px',
        'small': '12px',
      },
    },
  },
  plugins: [],
};