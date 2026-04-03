export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rubber: {
          50: '#f4fae9',
          100: '#e5f3cc',
          200: '#cae99a',
          300: '#a7da5c',
          400: '#8ac932',
          500: '#69ab15',
          600: '#508510',
          700: '#3d6511',
          800: '#345014',
          900: '#2b4413',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
