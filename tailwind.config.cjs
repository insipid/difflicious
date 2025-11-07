/** @type {import('tailwindcss').Config} */
module.exports = {
  // Configure dark mode to use our data-theme attribute
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/difflicious/templates/**/*.html',
    './src/difflicious/static/js/**/*.js',
  ],
  theme: {
    extend: {
      // Only extend utilities that aren't color-related
      // Colors are handled entirely by CSS variables now
      fontFamily: {
        mono: 'var(--font-family-mono)',
      },
      minWidth: {
        '0': '0px',
      },
      maxWidth: {
        '0': '0px',
      },
      // Info colors for hunk expansion areas (blue backgrounds)
      colors: {
        'info-bg': {
          50: 'var(--color-info-bg-50)',
          100: 'var(--color-info-bg-100)',
          200: 'var(--color-info-bg-200)',
          300: 'var(--color-info-bg-300)',
        },
        'info-text': {
          800: 'var(--color-info-text-800)',
        },
      },
    }
  },
  plugins: []
};
