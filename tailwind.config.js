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
    },
  },
  plugins: [],
};
