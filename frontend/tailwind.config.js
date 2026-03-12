/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0A0B10',
        surface: '#0F1117',
        'surface-2': '#161822',
        'surface-3': '#1E2030',
        violet: {
          DEFAULT: '#7A44E4',
          light: '#9B6BF7',
          dark: '#5A2DB8',
        },
        cyan: {
          DEFAULT: '#00E5FF',
          light: '#66F0FF',
          dark: '#00B8CC',
        },
        red: {
          DEFAULT: '#FF3B5C',
          light: '#FF6B84',
          dark: '#CC2E4A',
        },
        green: {
          DEFAULT: '#00C48C',
          light: '#33D4A4',
          dark: '#009D70',
        },
        amber: {
          DEFAULT: '#FFB020',
          light: '#FFC44D',
          dark: '#CC8D1A',
        },
        'text-primary': '#E8EAED',
        'text-secondary': '#9AA0AD',
        'text-muted': '#5A6173',
        border: '#1E2030',
        'border-light': '#2A2D3E',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
