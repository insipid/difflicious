# Dark/Light Mode Implementation Proposal for Difflicious

## Current Architecture Analysis

Based on my analysis of the codebase, here's what I found:

**Technology Stack:**
- Backend: Flask with Jinja2 templates
- Frontend: Vanilla JavaScript (not Alpine.js despite the `app.js` filename)
- Styling: Tailwind CSS + Custom CSS with CSS custom properties (CSS variables)
- Current styling approach: Uses CSS custom properties in `styles.css` with light theme as default

**Current Color System:**
The application already uses a well-structured CSS custom properties system in `/src/difflicious/static/css/styles.css`:

```css
:root {
    --color-primary: #2563eb;
    --color-primary-hover: #1d4ed8;
    --color-success: #059669;
    --color-danger: #dc2626;
    --color-warning: #d97706;
    --color-bg: #ffffff;
    --color-bg-secondary: #f8fafc;
    --color-bg-tertiary: #f1f5f9;
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-border: #e2e8f0;
    --color-border-hover: #cbd5e1;
}
```

## Implementation Strategy

### 1. Theme Detection & Management

**System Preference Detection:**
```javascript
// Add to diff-interactions.js
const ThemeManager = {
    STORAGE_KEY: 'difflicious-theme-preference',
    
    init() {
        this.applyTheme(this.getTheme());
        this.bindEventListeners();
    },
    
    getSystemPreference() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    
    getTheme() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored && ['light', 'dark', 'auto'].includes(stored)) {
            return stored;
        }
        return 'auto'; // Default to auto-detect
    },
    
    setTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme(theme);
    },
    
    applyTheme(theme) {
        const effectiveTheme = theme === 'auto' ? this.getSystemPreference() : theme;
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    },
    
    bindEventListeners() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.getTheme() === 'auto') {
                this.applyTheme('auto');
            }
        });
    }
};
```

### 2. CSS Theme Implementation

**Enhanced CSS Custom Properties:**
```css
/* Light theme (default) */
:root {
    --color-primary: #2563eb;
    --color-primary-hover: #1d4ed8;
    --color-success: #059669;
    --color-danger: #dc2626;
    --color-warning: #d97706;
    --color-bg: #ffffff;
    --color-bg-secondary: #f8fafc;
    --color-bg-tertiary: #f1f5f9;
    --color-text: #1e293b;
    --color-text-secondary: #64748b;
    --color-border: #e2e8f0;
    --color-border-hover: #cbd5e1;
    
    /* Diff-specific colors */
    --color-diff-addition-bg: #dcfce7;
    --color-diff-addition-text: #059669;
    --color-diff-deletion-bg: #fef2f2;
    --color-diff-deletion-text: #dc2626;
    --color-diff-context-bg: #ffffff;
    --color-diff-context-text: #64748b;
    --color-expanded-context-bg: #f9fafb;
}

/* Dark theme */
[data-theme="dark"] {
    --color-primary: #3b82f6;
    --color-primary-hover: #2563eb;
    --color-success: #10b981;
    --color-danger: #ef4444;
    --color-warning: #f59e0b;
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
    --color-bg-tertiary: #334155;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
    --color-border-hover: #475569;
    
    /* Diff-specific colors for dark mode */
    --color-diff-addition-bg: #0f2e14;
    --color-diff-addition-text: #10b981;
    --color-diff-deletion-bg: #2e0f14;
    --color-diff-deletion-text: #ef4444;
    --color-diff-context-bg: #0f172a;
    --color-diff-context-text: #94a3b8;
    --color-expanded-context-bg: #1e293b;
}
```

### 3. Tailwind CSS Integration

**Tailwind Configuration Update:**
```javascript
// tailwind.config.cjs
module.exports = {
  darkMode: 'class', // Use class-based dark mode
  content: [
    './src/difflicious/templates/**/*.html',
    './src/difflicious/static/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Map to CSS custom properties
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
      }
    }
  },
  plugins: []
};
```

### 4. UI Theme Toggle Component

**Theme Toggle Button (to be added to toolbar):**
```html
<!-- Add to partials/toolbar.html -->
<div class="flex items-center space-x-2">
    <div class="relative">
        <select id="theme-selector" 
                class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="auto">🌓 Auto</option>
            <option value="light">☀️ Light</option>
            <option value="dark">🌙 Dark</option>
        </select>
    </div>
</div>
```

### 5. Syntax Highlighting Theme Support

**Pygments Dark Theme Support:**
The application uses Pygments for syntax highlighting. We need to:

1. **Generate dark theme CSS:**
```python
# Add to template_service.py or create theme_service.py
def get_syntax_css(theme='default'):
    if theme == 'dark':
        return HtmlFormatter(style='monokai').get_style_defs('.highlight')
    else:
        return HtmlFormatter(style='default').get_style_defs('.highlight')
```

2. **Dynamic CSS injection:**
```javascript
// Add to diff-interactions.js
function updateSyntaxHighlighting(theme) {
    const existingStyles = document.getElementById('syntax-highlighting-theme');
    if (existingStyles) {
        existingStyles.remove();
    }
    
    // Fetch appropriate syntax highlighting CSS
    fetch(`/api/syntax-css?theme=${theme}`)
        .then(response => response.text())
        .then(css => {
            const styleElement = document.createElement('style');
            styleElement.id = 'syntax-highlighting-theme';
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
        });
}
```

### 6. Template Updates Required

**Base Template Updates:**
- Add theme class to `<html>` or `<body>` element
- Update Tailwind classes to use CSS custom properties
- Add theme selector to toolbar

**Component Updates:**
- Update diff file headers to use theme-aware colors
- Update diff line backgrounds for dark mode readability
- Ensure all interactive elements (buttons, forms) support both themes

### 7. Persistence & State Management

**Theme State Management:**
- Store theme preference in localStorage with repository-specific key
- Integrate with existing `DiffState` in `diff-interactions.js`
- Maintain theme state across page refreshes and navigation

### 8. Implementation Steps

1. **Phase 1: CSS Foundation**
   - Extend existing CSS custom properties with dark theme variants
   - Update Tailwind configuration
   - Test color contrast ratios for accessibility

2. **Phase 2: JavaScript Theme Management**
   - Add `ThemeManager` to `diff-interactions.js`
   - Implement system preference detection
   - Add theme persistence logic

3. **Phase 3: UI Integration**
   - Add theme toggle to toolbar
   - Update base template with theme class
   - Test all UI components in both themes

4. **Phase 4: Syntax Highlighting**
   - Implement dynamic Pygments theme switching
   - Add API endpoint for theme-specific CSS
   - Ensure code remains readable in both themes

5. **Phase 5: Testing & Polish**
   - Test system theme change responsiveness
   - Verify accessibility (WCAG contrast ratios)
   - Test on different browsers and devices

### 9. Benefits of This Approach

**Advantages:**
- **Minimal disruption:** Builds on existing CSS custom properties system
- **System-aware:** Respects user's OS theme preference
- **Persistent:** Remembers user choice per repository
- **Accessible:** Maintains proper contrast ratios
- **Performance:** No runtime theme switching overhead
- **Maintainable:** Centralized color management through CSS variables

**Technical Benefits:**
- No need to rewrite existing styles - just add dark theme variants
- Leverages browser-native `prefers-color-scheme` media query
- Compatible with existing Tailwind utilities
- Easy to extend with additional themes in the future

### 10. Accessibility Considerations

- Ensure minimum 4.5:1 contrast ratio for normal text
- Ensure minimum 3:1 contrast ratio for large text and UI elements
- Test with screen readers to ensure theme changes don't break navigation
- Provide keyboard navigation for theme selector

### 11. Future Enhancements

- **Additional themes:** High contrast, sepia, etc.
- **Custom theme creator:** Allow users to define custom color schemes
- **Time-based themes:** Automatic switching based on time of day
- **Per-file-type themes:** Different themes for different file types

This implementation provides a robust, accessible, and maintainable dark/light theme system that integrates seamlessly with the existing Difflicious architecture while respecting user preferences and system settings.