# CMS Image Management

This CMS system now supports dynamic image management for your homepage. You can easily change hero images and category background images through the admin interface.

## Features

### Homepage Images Management

- **Hero Images**: Two side-by-side images in the main hero section
- **Category Images**: Background images for each category card (Denim, Shoes, Accessories, etc.)
- **New In Banner**: Background image for the promotional "New In" section

### How to Use

1. **Access the CMS**: Go to `/admin/cms` and click on the "Homepage Images" tab
2. **Update Image URLs**: Enter valid image URLs for any section you want to change
3. **Preview**: Images are previewed in real-time as you enter URLs
4. **Save**: Click "Save Images" to apply changes to your homepage

### Image Requirements

- **Format**: JPG, PNG, WebP, or other web-compatible formats
- **Hero Images**: Recommended size 900x1200px for best quality
- **Category Images**: Recommended size 800x1000px
- **New In Banner**: Recommended size 1200x600px for wide banner
- **URLs**: Must be publicly accessible HTTPS URLs

### Image Hosting Options

#### Free Options:

- **Unsplash**: Professional stock photos (unsplash.com)
- **Pixabay**: Free stock images (pixabay.com)
- **Pexels**: High-quality free photos (pexels.com)

#### Paid/Professional Options:

- **Cloudinary**: Professional image CDN with optimization
- **AWS S3**: Scalable cloud storage
- **Vercel Blob**: Optimized for Next.js applications
- **Imgur**: Simple image hosting

#### For Development/Testing:

- **Picsum Photos**: Lorem Ipsum for photos (picsum.photos)
- **Placeholder.com**: Simple placeholder service

### Example URLs

```
Hero Images:
- Left: https://images.unsplash.com/photo-1441986300917-64674bd600d8
- Right: https://images.unsplash.com/photo-1469334031218-e382a71b716b

Category Images:
- Denim: https://images.unsplash.com/photo-1542272604-787c3835535d
- Shoes: https://images.unsplash.com/photo-1549298916-b41d501d3772
- Accessories: https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93
```

### Technical Details

#### Database Storage

Images are stored as URL references in the `SiteSettings` table:

- `heroImageLeft` - Left hero section image
- `heroImageRight` - Right hero section image
- `categoryImage[Name]` - Category background images

#### API Endpoints

- `GET /api/admin/cms/images` - Fetch current images (admin only)
- `POST /api/admin/cms/images` - Update images (admin only)
- `GET /api/content/images` - Public endpoint for homepage images

#### Frontend Integration

The homepage automatically loads images from the CMS system. Changes are reflected immediately after saving.

### Troubleshooting

#### Images Not Loading

1. Check if URLs are publicly accessible
2. Ensure URLs use HTTPS (not HTTP)
3. Verify image format is web-compatible
4. Check browser console for CORS errors

#### Permission Issues

- Ensure you're logged in as an admin user
- Check authentication status in the CMS interface

#### Performance Considerations

- Use optimized images (WebP when possible)
- Consider image CDNs for better performance
- Compress large images before uploading to hosting service

### Future Enhancements

Planned features for future versions:

- Direct file upload interface
- Image optimization and resizing
- Bulk image management
- Image gallery with thumbnails
- Integration with popular image CDNs
- Automatic image compression
