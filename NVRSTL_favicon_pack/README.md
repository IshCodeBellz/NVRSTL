# NVRSTL Favicon Pack

This directory contains the favicon files for the NVRSTL website.

## Required Files

To complete the favicon setup, you need to add the following files to the `public/` directory:

### Standard Favicons

- `favicon.ico` - Main favicon (16x16, 32x32, 48x48)
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon

### Apple Touch Icons

- `apple-touch-icon.png` - 180x180 Apple touch icon

### Android Chrome Icons

- `android-chrome-192x192.png` - 192x192 Android Chrome icon
- `android-chrome-512x512.png` - 512x512 Android Chrome icon

### Safari Pinned Tab

- `safari-pinned-tab.svg` - SVG for Safari pinned tabs

## Current Setup

The favicon configuration is already set up in `app/layout.tsx` with the following metadata:

```typescript
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
  other: [
    {
      rel: "mask-icon",
      url: "/safari-pinned-tab.svg",
      color: "#000000",
    },
  ],
},
manifest: "/site.webmanifest",
```

## Next Steps

1. Create or obtain the actual favicon files in the required sizes
2. Place them in the `public/` directory
3. Update the `theme_color` in `site.webmanifest` to match your brand colors
4. Test the favicon display across different browsers and devices

## Tools for Creating Favicons

- [Favicon.io](https://favicon.io/) - Free favicon generator
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive favicon generator
- [Favicon Generator](https://www.favicon-generator.org/) - Simple favicon generator
