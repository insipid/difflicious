/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'], // Use data-theme attribute for dark mode
  content: [
    './src/difflicious/templates/**/*.html',
    './src/difflicious/static/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Map existing custom properties
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        'bg-primary': 'var(--color-bg)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'text-primary': 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'border-primary': 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
        
        // Add variables for all hardcoded classes found in templates
        gray: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        red: {
          50: 'var(--color-danger-bg)',
          100: 'var(--color-danger-bg-100)',
          500: 'var(--color-danger-text-500)',
          600: 'var(--color-danger-text-600)',
          800: 'var(--color-danger-text-strong)',
        },
        green: {
          50: 'var(--color-success-bg)',
          100: 'var(--color-success-bg-100)',
          600: 'var(--color-success-text-600)',
          800: 'var(--color-success-text-800)',
        },
        blue: {
          50: 'var(--color-info-bg-50)',
          100: 'var(--color-info-bg-100)',
          200: 'var(--color-info-bg-200)',
          300: 'var(--color-info-bg-200)', // Using 200 as fallback
          500: 'var(--color-focus-ring)',
          600: 'var(--color-info-text-600)',
          800: 'var(--color-info-text-800)',
        },
      }
    }
  },
  plugins: []
};
