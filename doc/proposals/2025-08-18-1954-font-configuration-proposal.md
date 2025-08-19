# Font Configuration System Proposal

## Overview
Design a flexible font configuration system for Difflicious that allows users to customize fonts for both UI elements and diff content.

## Current State
- UI fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Mono fonts: `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace`
- Defined in CSS custom properties (`--font-family`, `--font-family-mono`)

## Configuration Options

### 1. Environment Variables (Simple)
```bash
export DIFFLICIOUS_FONT_UI="Inter, system-ui, sans-serif"
export DIFFLICIOUS_FONT_MONO="'Fira Code', 'SF Mono', monospace"
export DIFFLICIOUS_FONT_SIZE_MONO="14px"
```

### 2. Config File (Flexible)
```json
// ~/.difflicious/config.json
{
  "fonts": {
    "ui": {
      "family": "Inter, system-ui, sans-serif",
      "size": "16px"
    },
    "mono": {
      "family": "'Fira Code', 'JetBrains Mono', monospace",
      "size": "14px",
      "weight": "400",
      "lineHeight": "1.5"
    }
  },
  "webfonts": {
    "enabled": true,
    "provider": "google", // "google" | "local" | "cdn"
    "presets": ["fira-code", "jetbrains-mono"]
  }
}
```

### 3. Runtime API (Dynamic)
```javascript
// Browser-based configuration
window.difflicious.setFont('mono', "'JetBrains Mono', monospace");
window.difflicious.setFont('ui', "Inter, sans-serif");
```

### 4. Command Line Arguments
```bash
difflicious --font-mono="'Fira Code', monospace" --font-size-mono=14px
```

## Recommended Free Fonts

### Google Fonts (CDN Available)
1. **Fira Code** - Programming font with ligatures
2. **JetBrains Mono** - Developer-focused, excellent readability
3. **Source Code Pro** - Adobe's programming font
4. **IBM Plex Mono** - Modern, clean design
5. **Roboto Mono** - Google's monospace
6. **Inconsolata** - Humanist monospace

### System Fonts (Enhanced Stack)
```css
--font-family-mono: 
  'SF Mono', 
  'Cascadia Code', 
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'Roboto Mono',
  Menlo, 
  Monaco, 
  Consolas, 
  'DejaVu Sans Mono',
  'Liberation Mono', 
  'Courier New', 
  monospace;
```

## Implementation Architecture

### Phase 1: Enhanced CSS Variables
- Extend current CSS custom properties
- Add font size, weight, line-height controls
- Maintain backward compatibility

### Phase 2: Server-Side Configuration
- Add config file support
- Environment variable integration
- CLI argument parsing

### Phase 3: Web Font Integration
- Google Fonts CDN integration
- Local font serving option
- Font loading optimization

### Phase 4: Dynamic Font Switching
- Browser-based font selection UI
- Real-time preview
- Persistent user preferences

## Font Loading Strategy

### Option 1: CDN Loading
```html
<!-- Preload popular programming fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500&display=swap" as="style">
```

### Option 2: Self-Hosted Fonts
- Bundle popular fonts with the package
- Serve from `/static/fonts/` endpoint
- Better performance, no external dependencies

### Option 3: Hybrid Approach
- System fonts as primary stack
- Optional web font enhancement
- Graceful fallback

## Configuration Precedence
1. Runtime API calls (highest)
2. URL parameters
3. Config file
4. Environment variables
5. Command line arguments
6. Default values (lowest)

## User Experience Considerations

### Font Preview
- Live preview in settings UI
- Sample diff content for testing
- Common programming language examples

### Performance
- Lazy loading of web fonts
- Font display: swap for better loading
- Minimal impact on initial page load

### Accessibility
- Respect system font preferences
- Ensure sufficient contrast
- Support for high-DPI displays

## Recommended Implementation Order
1. Enhanced CSS variables system
2. Environment variable support
3. Config file support
4. Google Fonts integration
5. Font selection UI
6. Advanced features (ligatures, font variations)