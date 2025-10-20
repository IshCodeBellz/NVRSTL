-- Add CMS Content Management tables

-- Content pages table for different page types
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'landing', 'about', 'custom'
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- Content sections within pages (hero, features, testimonials, etc)
CREATE TABLE "ContentSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'hero', 'features', 'testimonials', 'cta', 'custom'
    "title" TEXT,
    "subtitle" TEXT,
    "content" TEXT, -- JSON content for flexible data
    "imageUrl" TEXT,
    "buttonText" TEXT,
    "buttonLink" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSection_pkey" PRIMARY KEY ("id")
);

-- Site settings for global configuration
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'boolean', 'json', 'image'
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");
CREATE INDEX "ContentSection_pageId_order_idx" ON "ContentSection"("pageId", "order");
CREATE INDEX "ContentSection_type_idx" ON "ContentSection"("type");
CREATE UNIQUE INDEX "SiteSettings_key_key" ON "SiteSettings"("key");

-- Add foreign key constraints
ALTER TABLE "ContentSection" ADD CONSTRAINT "ContentSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default landing page content
INSERT INTO "ContentPage" ("id", "slug", "title", "type") VALUES 
('clp_landing_01', 'home', 'Landing Page', 'landing');

-- Insert default sections for landing page
INSERT INTO "ContentSection" ("id", "pageId", "type", "title", "subtitle", "content", "order") VALUES 
('cls_hero_01', 'clp_landing_01', 'hero', 'Welcome to DY Official', 'Discover the latest fashion trends', '{"description": "Premium quality clothing and accessories for the modern lifestyle.", "ctaText": "Shop Now", "ctaLink": "/new-in"}', 1),
('cls_features_01', 'clp_landing_01', 'features', 'Why Choose Us', 'Quality you can trust', '{"features": [{"title": "Premium Quality", "description": "Carefully selected materials and craftsmanship"}, {"title": "Fast Shipping", "description": "Free delivery on orders over £50"}, {"title": "Easy Returns", "description": "30-day hassle-free return policy"}]}', 2),
('cls_reviews_01', 'clp_landing_01', 'reviews', 'Customer Reviews', 'What our customers say', '{"displayCount": 6, "showRatings": true, "autoPlay": true}', 3);

-- Insert default site settings
INSERT INTO "SiteSettings" ("id", "key", "value", "type", "description") VALUES 
('ss_site_name', 'siteName', 'DY Official', 'text', 'Website name displayed in header and title'),
('ss_site_description', 'siteDescription', 'Premium fashion and lifestyle brand', 'text', 'Default meta description'),
('ss_primary_color', 'primaryColor', '#000000', 'text', 'Primary brand color'),
('ss_secondary_color', 'secondaryColor', '#ffffff', 'text', 'Secondary brand color'),
('ss_logo_url', 'logoUrl', '/logo.png', 'image', 'Main site logo'),
('ss_hero_video', 'heroVideoUrl', '', 'text', 'Hero section background video URL'),
('ss_contact_email', 'contactEmail', 'hello@dyofficial.com', 'text', 'Contact email address'),
('ss_social_instagram', 'socialInstagram', '', 'text', 'Instagram profile URL'),
('ss_social_tiktok', 'socialTiktok', '', 'text', 'TikTok profile URL'),
('ss_free_shipping_threshold', 'freeShippingThreshold', '50', 'number', 'Minimum order value for free shipping');