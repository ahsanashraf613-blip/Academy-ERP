/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        slate: {
          925: '#0B1220',
        },
        brand: {
          50: '#EEF4FF',
          100: '#DCE8FF',
          300: '#93B4FF',
          500: '#3D63DD',
          600: '#2F4FBE',
          700: '#28409B',
        },
        moss: {
          500: '#2E7D5B',
        },
        amber: {
          500: '#C77D26',
        },
        rose: {
          500: '#C43D4B',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
