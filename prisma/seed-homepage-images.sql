-- Add default homepage images to SiteSettings using UPSERT
INSERT INTO "SiteSettings" (id, key, value, type, "createdAt", "updatedAt") VALUES 
  (gen_random_uuid(), 'heroImageLeft', 'https://picsum.photos/900/1200', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'heroImageRight', 'https://picsum.photos/901/1200', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageDenim', 'https://picsum.photos/seed/denim/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageShoes', 'https://picsum.photos/seed/shoes/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageAccessories', 'https://picsum.photos/seed/accessories/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageSportswear', 'https://picsum.photos/seed/sportswear/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageDresses', 'https://picsum.photos/seed/dresses/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageBrands', 'https://picsum.photos/seed/brands/800/1000', 'text', NOW(), NOW()),
  (gen_random_uuid(), 'categoryImageDrops', 'https://picsum.photos/seed/drops/1200/600', 'text', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  "updatedAt" = NOW();