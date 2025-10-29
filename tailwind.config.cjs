/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'], // Use data-theme attribute for dark mode
  content: [
    './src/difflicious/templates/**/*.html',
    './src/difflicious/static/js/**/*.js',
  ],
  safelist: [
    // Force dark mode classes to be included
    'dark:bg-neutral-700',
    'dark:bg-neutral-800',
    'dark:bg-neutral-900',
    'dark:border-neutral-600',
    'dark:border-neutral-700',
    'dark:text-neutral-100',
    'dark:bg-green-900/20',
    'dark:bg-red-900/20'
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

        // Info colors for expansion areas
        'info-bg-50': 'var(--color-info-bg-50)',
        'info-bg-100': 'var(--color-info-bg-100)',
        'info-bg-200': 'var(--color-info-bg-200)',
        'info-bg-300': 'var(--color-info-bg-300)',
        'info-text-600': 'var(--color-info-text-600)',
        'info-text-800': 'var(--color-info-text-800)',

        // Danger colors
        'danger-bg-50': 'var(--color-danger-bg-50)',
        'danger-bg-100': 'var(--color-danger-bg-100)',
        'danger-bg-200': 'var(--color-danger-bg-200)',
        'danger-bg-300': 'var(--color-danger-bg-300)',
        'danger-text-500': 'var(--color-danger-text-500)',
        'danger-text-600': 'var(--color-danger-text-600)',
        'danger-text-700': 'var(--color-danger-text-700)',

        // Success colors
        'success-bg-50': 'var(--color-success-bg-50)',
        'success-bg-100': 'var(--color-success-bg-100)',
        'success-bg-300': 'var(--color-success-bg-300)',
        'success-text-600': 'var(--color-success-text-600)',

        // Warning colors
        'warning-bg-100': 'var(--color-warning-bg-100)',
        'warning-text-800': 'var(--color-warning-text-800)',

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
          300: 'var(--color-info-bg-300)',
          500: 'var(--color-focus-ring)',
          600: 'var(--color-info-text-600)',
          800: 'var(--color-info-text-800)',
        },
      },
      minWidth: {
        '0': '0px',
      },
      maxWidth: {
        '0': '0px',
      },
      wordBreak: {
        'words': 'break-word',
      },
      textOverflow: {
        'ellipsis': 'ellipsis',
      },
      overflow: {
        'hidden': 'hidden',
      },
      whiteSpace: {
        'nowrap': 'nowrap',
      },
    }
  },
  plugins: []
};
