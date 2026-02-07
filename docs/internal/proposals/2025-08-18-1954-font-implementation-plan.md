# Font Configuration Implementation Plan

## Quick Start: Enhanced CSS Variables (Phase 1)

### 1. Enhanced CSS Variables System
**Goal**: Extend current font system with more options and better defaults
**Time**: 2-3 hours
**Impact**: High - immediate font customization capability

#### Changes to `styles.css`:
```css
:root {
    /* Enhanced font families with better stacks */
    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
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
    
    /* Font size controls */
    --font-size-mono: 13px;
    --font-size-mono-sm: 12px;
    --font-size-ui: 14px;
    --font-size-ui-lg: 16px;
    
    /* Font weight controls */
    --font-weight-mono: 400;
    --font-weight-mono-bold: 600;
    
    /* Line height controls */
    --line-height-mono: 1.5;
    --line-height-ui: 1.6;
}
```

### 2. Environment Variable Support
**Goal**: Allow font customization via environment variables
**Time**: 1-2 hours
**Impact**: Medium - server-side customization

#### Add to Flask app configuration:
```python
# In app.py or config module
import os

FONT_CONFIG = {
    'ui_family': os.getenv('DIFFLICIOUS_FONT_UI', None),
    'mono_family': os.getenv('DIFFLICIOUS_FONT_MONO', None),
    'mono_size': os.getenv('DIFFLICIOUS_FONT_SIZE_MONO', None),
    'mono_weight': os.getenv('DIFFLICIOUS_FONT_WEIGHT_MONO', None),
}

# Inject into templates
@app.context_processor
def inject_font_config():
    return {'font_config': FONT_CONFIG}
```

### 3. Google Fonts Integration
**Goal**: Add support for popular programming fonts
**Time**: 2-3 hours
**Impact**: High - much better font options

#### Option A: Configurable CDN Loading
```html
<!-- In base.html -->
{% if font_config.webfonts_enabled %}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
{% endif %}
```

#### Option B: Self-Hosted Fonts (Recommended)
- Download popular fonts to `static/fonts/`
- Create CSS font-face declarations
- No external dependencies

## Implementation Steps

### Step 1: Enhanced CSS (30 minutes)
1. Update `styles.css` with enhanced font stacks
2. Add CSS custom properties for sizes/weights
3. Update existing font references

### Step 2: Environment Variables (45 minutes)
1. Add font config to Flask app
2. Create template context processor
3. Add dynamic CSS generation

### Step 3: Self-Hosted Fonts (90 minutes)
1. Download 3-4 popular programming fonts
2. Create font-face CSS declarations
3. Add to build process

### Step 4: Documentation (30 minutes)
1. Update README with font customization options
2. Add examples for different use cases

## Recommended Font Additions

### Priority 1: Essential Programming Fonts
1. **Fira Code** - Most popular, great ligatures
2. **JetBrains Mono** - Excellent readability
3. **Source Code Pro** - Professional, clean

### Priority 2: Additional Options
4. **IBM Plex Mono** - Modern design
5. **Inconsolata** - Humanist approach

## Example Usage

### Environment Variables
```bash
# Use Fira Code for diffs
export DIFFLICIOUS_FONT_MONO="'Fira Code', 'SF Mono', monospace"
export DIFFLICIOUS_FONT_SIZE_MONO="14px"
export DIFFLICIOUS_FONT_WEIGHT_MONO="400"

# Use Inter for UI
export DIFFLICIOUS_FONT_UI="'Inter', system-ui, sans-serif"

difflicious
```

### CSS Override (Quick & Dirty)
```html
<!-- Add to base.html for quick testing -->
<style>
:root {
    --font-family-mono: 'JetBrains Mono', 'SF Mono', monospace !important;
    --font-size-mono: 15px !important;
}
</style>
```

## Font Files Structure
```
static/
├── fonts/
│   ├── fira-code/
│   │   ├── FiraCode-Regular.woff2
│   │   ├── FiraCode-Medium.woff2
│   │   └── FiraCode-Bold.woff2
│   ├── jetbrains-mono/
│   │   ├── JetBrainsMono-Regular.woff2
│   │   ├── JetBrainsMono-Medium.woff2
│   │   └── JetBrainsMono-Bold.woff2
│   └── fonts.css
└── css/
    ├── styles.css (imports fonts.css)
    └── tailwind.css
```

## Testing Plan
1. Test with different font combinations
2. Verify fallbacks work correctly
3. Test performance impact
4. Test on different operating systems
5. Verify accessibility (contrast, readability)

## Future Enhancements
- Browser-based font selection UI
- Font preview functionality
- User preference persistence
- Advanced typography options (ligatures, variations)
- Custom font upload support