import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          200: '#c7c4ff',
          300: '#a5a0ff',
          400: '#7c6fff',
          500: '#5B4CF0',
          600: '#4338CA',
          700: '#3730A3',
          800: '#2E2B8A',
          900: '#1D1A57',
          950: '#0D0B2A',
        },
        accent: {
          400: '#7B2FDB',
          500: '#6D28D9',
          600: '#5B21B6',
        },
        slate: {
          750: '#293548',
          850: '#172033',
        },
        warm: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          400: '#facc15',
          500: '#eab308',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'elevated': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 10px 15px -3px rgb(0 0 0 / 0.05)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
