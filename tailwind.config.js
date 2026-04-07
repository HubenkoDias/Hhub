/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#EAE7E0',
          dark: '#D8D4CB',
        },
        charcoal: {
          DEFAULT: '#0F0F0F',
          light: '#1A1A1A',
        },
        accent: {
          DEFAULT: '#C8473A',
          light: '#D9584B',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      opacity: {
        '8': '0.08',
        '15': '0.15',
      },
    },
  },
  plugins: [],
}
