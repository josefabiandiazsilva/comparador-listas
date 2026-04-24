/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        moodle: {
          light: '#fff7ed',
          border: '#fed7aa',
          text: '#c2410c',
          bg: '#ea580c',
        },
        siga: {
          light: '#f0fdf4',
          border: '#bbf7d0',
          text: '#15803d',
          bg: '#16a34a',
        },
      },
    },
  },
  plugins: [],
}
