# Font Setup Documentation

## VirtualModern Font

The VirtualModern font has been configured for use in the currency selector component.

### Font Files Required

Place the following font files in `/public/fonts/`:

- `VirtualModern-Regular.woff2`
- `VirtualModern-Regular.woff`
- `VirtualModern-Bold.woff2`
- `VirtualModern-Bold.woff`

### CSS Configuration

The font is defined in `app/globals.css`:

```css
@font-face {
  font-family: "VirtualModern";
  src: url("/fonts/VirtualModern-Regular.woff2") format("woff2"), url("/fonts/VirtualModern-Regular.woff")
      format("woff");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "VirtualModern";
  src: url("/fonts/VirtualModern-Bold.woff2") format("woff2"), url("/fonts/VirtualModern-Bold.woff")
      format("woff");
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}
```

### Tailwind Configuration

The font is available as `font-virtual-modern` in Tailwind:

```javascript
fontFamily: {
  "virtual-modern": ["VirtualModern", "Inter", "SF Pro Display", "system-ui", "sans-serif"],
}
```

### Usage

The currency selector uses the VirtualModern font with the following styling:

```css
.currency-selector {
  @apply font-virtual-modern font-bold tracking-wide text-sm uppercase;
}
```

### Fallback Fonts

If the VirtualModern font files are not available, the system will fall back to:

1. Inter
2. SF Pro Display
3. system-ui
4. sans-serif

### Current Implementation

- **Desktop**: Currency selector in header navigation
- **Mobile**: Currency selector in mobile menu
- **Styling**: Bold, uppercase, wide tracking, small text size
