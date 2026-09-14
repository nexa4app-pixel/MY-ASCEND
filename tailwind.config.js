/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Segoe UI Variable Text', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        fluent: {
          bg: {
            light: '#f3f3f3',
            dark: '#202020',
          },
          card: {
            light: 'rgba(255, 255, 255, 0.72)',
            dark: 'rgba(38, 38, 38, 0.72)',
          },
          cardHover: {
            light: 'rgba(255, 255, 255, 0.9)',
            dark: 'rgba(48, 48, 48, 0.85)',
          },
          border: {
            light: 'rgba(0, 0, 0, 0.08)',
            dark: 'rgba(255, 255, 255, 0.08)',
          },
          borderStrong: {
            light: 'rgba(0, 0, 0, 0.16)',
            dark: 'rgba(255, 255, 255, 0.16)',
          },
          text: {
            primary: {
              light: '#1f1f1f',
              dark: '#ffffff',
            },
            secondary: {
              light: '#616161',
              dark: '#adadad',
            },
            tertiary: {
              light: '#8a8a8a',
              dark: '#757575',
            },
          },
          accent: {
            DEFAULT: '#0078d4',
            hover: '#106ebe',
            active: '#005a9e',
            light: '#2b88d8',
            dark: '#0078d4',
            subtle: {
              light: '#eff6fc',
              dark: '#1b2a38',
            },
          },
        },
      },
      boxShadow: {
        'fluent-elevation-1': '0 1.6px 3.6px 0 rgba(0,0,0,0.13), 0 0.3px 0.9px 0 rgba(0,0,0,0.11)',
        'fluent-elevation-4': '0 6.4px 14.4px 0 rgba(0,0,0,0.13), 0 1.2px 3.6px 0 rgba(0,0,0,0.11)',
        'fluent-elevation-8': '0 12.8px 28.8px 0 rgba(0,0,0,0.15), 0 2.4px 7.2px 0 rgba(0,0,0,0.13)',
      },
    },
  },
  plugins: [],
};
