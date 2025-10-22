# Favicon Generation Example

## Quick Start

1. **Add your source image** to this directory:

   ```bash
   # Place your logo/image as one of these files:
   cp your-logo.png NVRSTL_favicon_pack/source.png
   # OR
   cp your-logo.svg NVRSTL_favicon_pack/source.svg
   ```

2. **Install ImageMagick** (if not already installed):

   ```bash
   # macOS
   brew install imagemagick

   # Ubuntu/Debian
   sudo apt-get install imagemagick

   # Windows (using Chocolatey)
   choco install imagemagick
   ```

3. **Generate favicon files**:

   ```bash
   cd NVRSTL_favicon_pack
   node generate-favicons.js
   ```

4. **Verify the files** were created in the `public/` directory:
   ```bash
   ls -la ../public/favicon*
   ls -la ../public/apple-touch-icon.png
   ls -la ../public/android-chrome-*.png
   ```

## What Gets Generated

The script will create these files in the `public/` directory:

- `favicon.ico` - Main favicon (32x32)
- `favicon-16x16.png` - 16x16 PNG favicon
- `favicon-32x32.png` - 32x32 PNG favicon
- `apple-touch-icon.png` - 180x180 Apple touch icon
- `android-chrome-192x192.png` - 192x192 Android Chrome icon
- `android-chrome-512x512.png` - 512x512 Android Chrome icon

## Testing Your Favicon

1. **Start the development server**:

   ```bash
   npm run dev
   ```

2. **Check the browser tab** - you should see your favicon in the browser tab

3. **Test on mobile** - add to home screen to test the Apple touch icon

4. **Validate with tools**:
   - [Favicon Checker](https://realfavicongenerator.net/favicon_checker)
   - [Web App Manifest Validator](https://manifest-validator.appspot.com/)

## Customization

### Update Theme Colors

Edit `public/site.webmanifest` to match your brand:

```json
{
  "theme_color": "#your-brand-color",
  "background_color": "#ffffff"
}
```

### Update Safari Pinned Tab

Create `public/safari-pinned-tab.svg` for Safari pinned tabs:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="your-logo-path" fill="#000000"/>
</svg>
```

## Troubleshooting

### ImageMagick Issues

- Make sure ImageMagick is installed: `magick -version`
- On macOS, you might need to allow ImageMagick in System Preferences > Security & Privacy

### File Not Found

- Ensure your source image is named correctly: `source.png`, `source.svg`, `source.jpg`, or `source.jpeg`
- Check that the file is in the `NVRSTL_favicon_pack/` directory

### Build Issues

- Run `npm run build` to ensure the favicon configuration doesn't break the build
- Check browser console for any favicon-related errors
