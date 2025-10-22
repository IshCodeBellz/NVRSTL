# AnxlerTechnology Font Setup

This document outlines the setup for the AnxlerTechnology corporate font family used in the Recently Viewed section.

## Font Files Required

Place the following font files in the `/public/fonts/` directory:

- `anxler-technology-corporate-font-family-2025-08-07-22-25-55-utc.woff2`
- `anxler-technology-corporate-font-family-2025-08-07-22-25-55-utc.woff`

## Current Implementation

The font has been configured in the following files:

### 1. CSS Font Definition (`app/globals.css`)

```css
@font-face {
  font-family: "AnxlerTechnology";
  src: url("/fonts/anxler-technology-corporate-font-family-2025-08-07-22-25-55-utc.woff2")
      format("woff2"), url("/fonts/anxler-technology-corporate-font-family-2025-08-07-22-25-55-utc.woff")
      format("woff");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

### 2. Tailwind Configuration (`tailwind.config.js`)

```javascript
fontFamily: {
  "anxler-tech": [
    "AnxlerTechnology",
    "Inter",
    "SF Pro Display",
    "system-ui",
    "sans-serif",
  ],
}
```

### 3. CSS Class Definition (`app/globals.css`)

```css
.font-anxler-tech {
  font-family: "AnxlerTechnology", "Inter", "SF Pro Display", "system-ui",
    sans-serif;
  font-weight: 500;
  letter-spacing: 0.05em;
}
```

### 4. Usage in RecentlyViewed Component

```tsx
<p className="mt-2 text-[11px] font-medium line-clamp-2 leading-tight font-anxler-tech tracking-wide text-white">
  {p.name}
</p>
<div className="mt-1 text-[12px] font-anxler-tech tracking-wide text-white">
  {/* Price content */}
</div>
```

## Next Steps

1. **Add Font Files**: Replace the placeholder files with the actual AnxlerTechnology font files
2. **Test Display**: Verify the font renders correctly in the Recently Viewed section
3. **Optimize**: Consider adding font-weight variations if needed

## Fallback Fonts

The font stack includes fallbacks in this order:

1. AnxlerTechnology (primary)
2. Inter
3. SF Pro Display
4. system-ui
5. sans-serif (generic fallback)

This ensures the text remains readable even if the custom font fails to load.
