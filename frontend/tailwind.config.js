/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#080d1a',
        surface: '#0f1629',
        border: '#1e2d4a',
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        stable: '#22c55e',
        accent: '#3b82f6',
        muted: '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
