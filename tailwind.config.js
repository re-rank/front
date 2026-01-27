/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f7f4',
          100: '#e2ebe3',
          200: '#c5d7c8',
          300: '#9fbaa3',
          400: '#749b7a',
          500: '#557d5b',
          600: '#416347',
          700: '#354f3a',
          800: '#2c4030',
          900: '#243528',
          950: '#131d16',
        },
        warm: {
          50: '#faf9f7',
          100: '#f6f5f2',
          200: '#e8e6e1',
          300: '#d5d2cb',
          400: '#b8b3a8',
          500: '#9a9488',
          600: '#7d776b',
          700: '#625d53',
          800: '#4a4640',
          900: '#363330',
          950: '#1f1d1b',
        },
      },
    },
  },
  plugins: [],
}
