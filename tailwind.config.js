/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#f7f4ef',
          dark: '#12110f',
        },
        ink: {
          DEFAULT: '#1a1917',
          muted: '#5c5852',
          dark: '#e8e4dc',
        },
        plum: {
          DEFAULT: '#6b4c6a',
          soft: '#8a6b89',
          light: '#c9b0c7',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1c1b19',
        },
        border: {
          DEFAULT: '#e5e0d8',
          dark: '#2e2c29',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      maxWidth: {
        'card': '420px',
      },
      boxShadow: {
        'card': '0 12px 40px -12px rgba(26, 25, 23, 0.18)',
        'card-dark': '0 12px 40px -12px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
