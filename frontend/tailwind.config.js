/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#000000',
        'window-bg': '#171717',
        'user-bubble': '#2f2f2f',
        'accent': '#6366f1',
      },
      borderRadius: {
        'window': '24px',
        'bubble': '18px',
      },
      boxShadow: {
        'window': '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      }
    },
  },
  plugins: [],
}
