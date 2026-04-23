/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#f0f4f8',
          secondary: '#ffffff',
          tertiary: '#f7f9fc',
          card: '#ffffff',
          hover: '#e8eef5',
          sunken: '#e8eef5',
        },
        accent: {
          green: '#52b788',
          cyan: '#5b9bd5',
          amber: '#e8a838',
          red: '#d4829a',
          violet: '#9d8fcc',
          orange: '#e8a838',
        },
        text: {
          primary: '#2c3e50',
          secondary: '#5d7a8a',
          muted: '#8fa8b8',
          hint: '#b8ccd8',
        },
        border: {
          DEFAULT: '#dde7ef',
          active: '#5b9bd5',
        },
        primary: {
          DEFAULT: '#5b9bd5',
          light: '#deeaf7',
          dark: '#3d7ab5',
        },
        green: {
          DEFAULT: '#52b788',
          light: '#d8f3e8',
        },
        lavender: {
          DEFAULT: '#9d8fcc',
          light: '#ebe8f7',
        },
        amber: {
          DEFAULT: '#e8a838',
          light: '#fef3dc',
        },
        rose: {
          DEFAULT: '#d4829a',
          light: '#fce8ef',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        'pill': '50px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'calm-sm': '0 2px 8px rgba(91,155,213,0.08)',
        'calm-md': '0 4px 20px rgba(91,155,213,0.12)',
        'calm-lg': '0 8px 40px rgba(91,155,213,0.16)',
        'card-glow': '0 0 0 3px rgba(91,155,213,0.15)',
        'btn': '0 4px 15px rgba(91,155,213,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(0.95)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
