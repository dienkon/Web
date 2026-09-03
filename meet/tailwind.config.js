/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        meet: {
          dark: '#121212',
          card: '#202124',
          hover: '#282a2d',
          border: '#3c4043',
          red: '#ea4335',
          green: '#137333',
          blue: '#1a73e8',
          blueHover: '#1557b0',
          yellow: '#f9ab00',
        }
      },
      animation: {
        'pulse-speaking': 'pulse-speaking 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-speaking': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(52, 168, 83, 0.9)' },
          '50%': { boxShadow: '0 0 0 5px rgba(52, 168, 83, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
