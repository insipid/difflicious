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
    }
  },
  plugins: []
};
