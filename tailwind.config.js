/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-persian)', 'var(--font-english)', 'system-ui', 'sans-serif'],
        persian: ['Vazirmatn', 'system-ui', 'sans-serif'],
        english: ['Segoe UI Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        fluent: {
          bg: {
            light: '#f3f5f8',
            dark: '#0d0f12',
          },
          surface: {
            light: '#ffffff',
            dark: '#161922',
          },
          elevated: {
            light: '#e8ecef',
            dark: '#202532',
          },
          card: {
            light: 'rgba(255, 255, 255, 0.82)',
            dark: 'rgba(22, 25, 34, 0.78)',
          },
          cardHover: {
            light: 'rgba(255, 255, 255, 0.95)',
            dark: 'rgba(32, 37, 50, 0.9)',
          },
          border: {
            light: 'rgba(0, 0, 0, 0.08)',
            dark: 'rgba(255, 255, 255, 0.08)',
          },
          borderSubtle: {
            light: 'rgba(0, 0, 0, 0.05)',
            dark: 'rgba(255, 255, 255, 0.05)',
          },
          borderStrong: {
            light: 'rgba(0, 0, 0, 0.14)',
            dark: 'rgba(255, 255, 255, 0.16)',
          },
          text: {
            primary: {
              light: '#1f1f1f',
              dark: '#f5f6f8',
            },
            secondary: {
              light: '#5c6270',
              dark: '#9fa6b2',
            },
            tertiary: {
              light: '#878e9c',
              dark: '#6b7280',
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
        'fluent-elevation-1': '0 1.6px 3.6px 0 rgba(0,0,0,0.08), 0 0.3px 0.9px 0 rgba(0,0,0,0.06)',
        'fluent-elevation-4': '0 6.4px 14.4px 0 rgba(0,0,0,0.09), 0 1.2px 3.6px 0 rgba(0,0,0,0.07)',
        'fluent-elevation-8': '0 12.8px 28.8px 0 rgba(0,0,0,0.11), 0 2.4px 7.2px 0 rgba(0,0,0,0.09)',
      },
    },
  },
  plugins: [],
};
