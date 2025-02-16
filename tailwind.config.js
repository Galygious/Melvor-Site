/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html"
  ],
  theme: {
    extend: {
      colors: {
        'melvor-bg': '#1a1f2e',
        'melvor-surface': '#2a2f3e',
        'melvor-accent': '#4a7dff',
        'melvor-hover': '#3a3f4e',
        'custom-blue': '#0055ff',
        'custom-red': '#ff3355'
      }
    }
  },
  plugins: []
}
