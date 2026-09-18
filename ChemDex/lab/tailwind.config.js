/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "#f8fafc",
          surface: "#ffffff",
          panel: "#f1f5f9",
          border: "#e2e8f0",
          accent: "#0284c7", // scientific cyan/blue
          accentHover: "#0369a1",
          teal: "#0d9488",
          indigo: "#4f46e5",
          danger: "#ef4444",
          warning: "#f59e0b",
          success: "#10b981",
          text: "#0f172a",
          muted: "#64748b"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace']
      },
      boxShadow: {
        'lab-subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'lab-card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'lab-float': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
