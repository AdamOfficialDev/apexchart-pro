/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Trebuchet MS', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#0A0D14',
          900: '#131722',
          850: '#181C27',
          800: '#1E222D',
          700: '#2A2E39',
          600: '#363A45',
        },
        brand: {
          blue: '#2962FF',
          cyan: '#00D4AA',
          bull: '#089981',
          bear: '#F23645',
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateX(16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 160ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        popIn: 'popIn 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideRight: 'slideRight 170ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        toastIn: 'toastIn 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      boxShadow: {
        popover: '0 20px 48px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        glowBlue: '0 0 16px -3px rgba(41, 98, 255, 0.5)',
        glowCyan: '0 0 16px -3px rgba(0, 212, 170, 0.45)',
      },
    },
  },
  plugins: [],
};
