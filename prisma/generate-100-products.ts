import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Product data templates
const productTemplates = {
  "womens-clothing": [
    // Dresses
    {
      name: "Midi Wrap Dress",
      desc: "Elegant wrap-style midi dress perfect for office or evening wear",
      price: 4599,
      materials: "Polyester blend",
      care: "Machine wash cold",
    },
    {
      name: "Little Black Dress",
      desc: "Classic black dress that never goes out of style",
      price: 6899,
      materials: "Cotton blend",
      care: "Dry clean only",
    },
    {
      name: "Floral Maxi Dress",
      desc: "Flowing maxi dress with beautiful floral print",
      price: 5299,
      materials: "Chiffon",
      care: "Hand wash",
    },
    {
      name: "Bodycon Mini Dress",
      desc: "Figure-hugging mini dress for night out",
      price: 3999,
      materials: "Stretch fabric",
      care: "Machine wash cold",
    },
    {
      name: "Vintage A-Line Dress",
      desc: "Retro-inspired A-line dress with classic silhouette",
      price: 4799,
      materials: "Cotton",
      care: "Machine wash warm",
    },

    // Tops
    {
      name: "Silk Blouse",
      desc: "Luxurious silk blouse for professional wear",
      price: 7899,
      materials: "Silk",
      care: "Dry clean only",
    },
    {
      name: "Crop Top",
      desc: "Trendy crop top perfect for summer",
      price: 1999,
      materials: "Cotton",
      care: "Machine wash cold",
    },
    {
      name: "Off-Shoulder Top",
      desc: "Romantic off-shoulder top with feminine details",
      price: 3299,
      materials: "Rayon",
      care: "Hand wash",
    },
    {
      name: "Button-Up Shirt",
      desc: "Classic button-up shirt in crisp white",
      price: 3899,
      materials: "Cotton",
      care: "Machine wash warm",
    },
    {
      name: "Knit Sweater",
      desc: "Cozy knit sweater for cooler weather",
      price: 5499,
      materials: "Wool blend",
      care: "Hand wash cold",
    },

    // Bottoms
    {
      name: "High-Waisted Jeans",
      desc: "Flattering high-waisted skinny jeans",
      price: 6299,
      materials: "Denim",
      care: "Machine wash cold",
    },
    {
      name: "Pleated Skirt",
      desc: "Elegant pleated midi skirt",
      price: 4299,
      materials: "Polyester",
      care: "Machine wash cold",
    },
    {
      name: "Wide-Leg Trousers",
      desc: "Sophisticated wide-leg trousers",
      price: 5899,
      materials: "Crepe",
      care: "Dry clean",
    },
    {
      name: "Denim Shorts",
      desc: "Casual denim shorts for summer",
      price: 2899,
      materials: "Cotton denim",
      care: "Machine wash cold",
    },
    {
      name: "Leather Leggings",
      desc: "Faux leather leggings for edgy look",
      price: 4999,
      materials: "Faux leather",
      care: "Wipe clean",
    },
  ],

  "mens-clothing": [
    // Shirts
    {
      name: "Oxford Button-Down",
      desc: "Classic Oxford cotton button-down shirt",
      price: 4599,
      materials: "Cotton",
      care: "Machine wash warm",
    },
    {
      name: "Flannel Shirt",
      desc: "Comfortable flannel shirt for casual wear",
      price: 3999,
      materials: "Cotton flannel",
      care: "Machine wash warm",
    },
    {
      name: "Dress Shirt",
      desc: "Formal dress shirt for business attire",
      price: 5299,
      materials: "Cotton blend",
      care: "Dry clean preferred",
    },
    {
      name: "Henley Shirt",
      desc: "Casual henley with button placket",
      price: 2899,
      materials: "Cotton",
      care: "Machine wash cold",
    },
    {
      name: "Polo Shirt",
      desc: "Classic polo shirt for smart casual look",
      price: 3599,
      materials: "Pique cotton",
      care: "Machine wash cold",
    },

    // Pants
    {
      name: "Chino Pants",
      desc: "Versatile chino pants for any occasion",
      price: 4999,
      materials: "Cotton twill",
      care: "Machine wash warm",
    },
    {
      name: "Straight Jeans",
      desc: "Classic straight-cut denim jeans",
      price: 6799,
      materials: "Denim",
      care: "Machine wash cold",
    },
    {
      name: "Dress Pants",
      desc: "Formal dress pants for professional wear",
      price: 7299,
      materials: "Wool blend",
      care: "Dry clean only",
    },
    {
      name: "Cargo Shorts",
      desc: "Practical cargo shorts with multiple pockets",
      price: 3299,
      materials: "Cotton canvas",
      care: "Machine wash warm",
    },
    {
      name: "Track Pants",
      desc: "Comfortable track pants for leisure",
      price: 3999,
      materials: "Polyester blend",
      care: "Machine wash cold",
    },

    // Outerwear
    {
      name: "Denim Jacket",
      desc: "Classic denim jacket for layering",
      price: 7899,
      materials: "Cotton denim",
      care: "Machine wash cold",
    },
    {
      name: "Bomber Jacket",
      desc: "Modern bomber jacket with ribbed cuffs",
      price: 8999,
      materials: "Nylon",
      care: "Machine wash cold",
    },
    {
      name: "Hoodie",
      desc: "Comfortable pullover hoodie",
      price: 4599,
      materials: "Cotton fleece",
      care: "Machine wash warm",
    },
    {
      name: "Cardigan",
      desc: "Sophisticated knit cardigan",
      price: 6299,
      materials: "Wool blend",
      care: "Hand wash cold",
    },
    {
      name: "Peacoat",
      desc: "Classic wool peacoat for winter",
      price: 12999,
      materials: "Wool",
      care: "Dry clean only",
    },
  ],

  sportswear: [
    // Athletic Tops
    {
      name: "Performance Tank",
      desc: "Moisture-wicking tank for intense workouts",
      price: 2799,
      materials: "Polyester blend",
      care: "Machine wash cold",
    },
    {
      name: "Sports Bra",
      desc: "High-support sports bra for active lifestyle",
      price: 3999,
      materials: "Spandex blend",
      care: "Machine wash cold",
    },
    {
      name: "Running Shirt",
      desc: "Breathable running shirt with reflective details",
      price: 3599,
      materials: "Technical fabric",
      care: "Machine wash cold",
    },
    {
      name: "Yoga Top",
      desc: "Flexible yoga top for mindful movement",
      price: 4299,
      materials: "Bamboo blend",
      care: "Machine wash cold",
    },
    {
      name: "Compression Shirt",
      desc: "Compression shirt for muscle support",
      price: 4999,
      materials: "Compression fabric",
      care: "Machine wash cold",
    },

    // Athletic Bottoms
    {
      name: "Yoga Leggings",
      desc: "High-waisted leggings for yoga and pilates",
      price: 5999,
      materials: "Lycra blend",
      care: "Machine wash cold",
    },
    {
      name: "Running Shorts",
      desc: "Lightweight shorts with built-in brief",
      price: 3299,
      materials: "Polyester",
      care: "Machine wash cold",
    },
    {
      name: "Sweatpants",
      desc: "Comfortable sweatpants for casual wear",
      price: 4599,
      materials: "Cotton fleece",
      care: "Machine wash warm",
    },
    {
      name: "Cycling Shorts",
      desc: "Padded cycling shorts for comfort",
      price: 6299,
      materials: "Lycra",
      care: "Machine wash cold",
    },
    {
      name: "Track Shorts",
      desc: "Classic track shorts with side stripes",
      price: 2999,
      materials: "Polyester",
      care: "Machine wash cold",
    },

    // Athletic Footwear
    {
      name: "Cross-Training Shoes",
      desc: "Versatile shoes for gym workouts",
      price: 8999,
      materials: "Synthetic mesh",
      care: "Spot clean",
    },
    {
      name: "Basketball Sneakers",
      desc: "High-top sneakers for court performance",
      price: 12999,
      materials: "Leather/mesh",
      care: "Spot clean",
    },
    {
      name: "Yoga Mat",
      desc: "Non-slip yoga mat for practice",
      price: 3999,
      materials: "TPE foam",
      care: "Wipe clean",
    },
    {
      name: "Gym Bag",
      desc: "Spacious gym bag with shoe compartment",
      price: 4999,
      materials: "Nylon",
      care: "Spot clean",
    },
    {
      name: "Water Bottle",
      desc: "Insulated water bottle for hydration",
      price: 2499,
      materials: "Stainless steel",
      care: "Hand wash",
    },
  ],
};

const brands = [
  "ASOS Design",
  "New Look",
  "Topshop",
  "H&M",
  "Zara",
  "Uniqlo",
  "Gap",
  "Nike",
  "Adidas",
  "Puma",
  "Under Armour",
  "Levi's",
  "Calvin Klein",
  "Tommy Hilfiger",
  "Ralph Lauren",
  "Forever 21",
  "Urban Outfitters",
  "American Eagle",
  "Abercrombie",
  "Hollister",
];

const sizeVariants = {
  "womens-clothing": ["XS", "S", "M", "L", "XL", "XXL"],
  "mens-clothing": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  sportswear: ["XS", "S", "M", "L", "XL", "XXL"],
};

const colors = [
  "Black",
  "White",
  "Navy",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Pink",
  "Purple",
  "Brown",
  "Beige",
  "Olive",
];

function generateSKU(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDescription(template: any, color: string): string {
  return `${
    template.desc
  } in ${color.toLowerCase()}. Made from high-quality ${template.materials.toLowerCase()}. ${
    template.care
  }.`;
}

function generateImageUrls(category: string, productName: string): string[] {
  const baseImageName = productName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return [
    `/images/products/${category}/${baseImageName}-1.jpg`,
    `/images/products/${category}/${baseImageName}-2.jpg`,
  ];
}

async function generateProducts() {
  console.log("🏭 Starting generation of 100 new products...");

  // Get existing categories and brands
  const categories = await prisma.category.findMany();
  const existingBrands = await prisma.brand.findMany();

  // Create brand mapping
  const brandMap = new Map();
  for (const brand of existingBrands) {
    brandMap.set(brand.name, brand.id);
  }

  // Create missing brands
  for (const brandName of brands) {
    if (!brandMap.has(brandName)) {
      const newBrand = await prisma.brand.create({
        data: { name: brandName },
      });
      brandMap.set(brandName, newBrand.id);
    }
  }

  // Create category mapping
  const categoryMap = new Map();
  for (const category of categories) {
    categoryMap.set(category.slug, category.id);
  }

  let productCount = 0;
  const productsPerCategory = Math.ceil(
    100 / Object.keys(productTemplates).length
  );

  for (const [categorySlug, templates] of Object.entries(productTemplates)) {
    const categoryId = categoryMap.get(categorySlug);
    if (!categoryId) continue;

    console.log(`📦 Generating products for ${categorySlug}...`);

    for (let i = 0; i < productsPerCategory && productCount < 100; i++) {
      const template = getRandomElement(templates);
      const color = getRandomElement(colors);
      const brand = getRandomElement(brands);
      const brandId = brandMap.get(brand);

      const productName = `${color} ${template.name}`;
      const sku = generateSKU();

      // Add some price variation (±20%)
      const priceVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const finalPrice = Math.round(template.price * priceVariation);

      try {
        const product = await prisma.product.create({
          data: {
            sku,
            name: productName,
            description: generateDescription(template, color),
            shortDescription: template.desc,
            priceCents: finalPrice,
            comparePriceCents:
              Math.random() > 0.7 ? Math.round(finalPrice * 1.2) : null,
            brandId,
            categoryId,
            isActive: true,
            isFeatured: Math.random() > 0.9, // 10% chance of being featured
            materials: template.materials,
            careInstructions: template.care,
            tags: `${color.toLowerCase()},${template.name
              .toLowerCase()
              .replace(/\s+/g, "-")},${categorySlug}`,
            seoTitle: `${productName} - ${brand}`,
            seoDescription: `Buy ${productName} from ${brand}. ${template.desc}. Free shipping available.`,
          },
        });

        // Create product images
        const imageUrls = generateImageUrls(categorySlug, template.name);
        for (let j = 0; j < imageUrls.length; j++) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: imageUrls[j],
              alt: `${productName} - Image ${j + 1}`,
              position: j,
              imageType: j === 0 ? "primary" : "gallery",
            },
          });
        }

        // Create size variants
        const sizes = sizeVariants[
          categorySlug as keyof typeof sizeVariants
        ] || ["One Size"];
        for (const size of sizes) {
          await prisma.sizeVariant.create({
            data: {
              productId: product.id,
              label: size,
              stock: Math.floor(Math.random() * 50) + 10, // 10-59 items in stock
            },
          });
        }

        // Occasionally create product metrics
        if (Math.random() > 0.8) {
          await prisma.productMetrics.create({
            data: {
              productId: product.id,
              views: Math.floor(Math.random() * 1000) + 100,
              detailViews: Math.floor(Math.random() * 500) + 50,
              purchases: Math.floor(Math.random() * 50) + 5,
              addToCart: Math.floor(Math.random() * 150) + 20,
              wishlists: Math.floor(Math.random() * 75) + 10,
            },
          });
        }

        productCount++;
        if (productCount % 10 === 0) {
          console.log(`   ✅ Created ${productCount} products...`);
        }
      } catch (error) {
      console.error("Error:", error);
        console.error(`❌ Failed to create product ${productName}:`, error);
      }
    }
  }

  console.log(`🎉 Successfully generated ${productCount} new products!`);

  // Generate some product relations
  console.log("🔗 Creating product relationships...");
  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, categoryId: true },
  });

  let relationCount = 0;
  for (let i = 0; i < Math.min(50, allProducts.length); i++) {
    const mainProduct = getRandomElement(allProducts);
    const relatedProducts = allProducts
      .filter(
        (p) =>
          p.categoryId === mainProduct.categoryId && p.id !== mainProduct.id
      )
      .slice(0, Math.floor(Math.random() * 3) + 1);

    for (const related of relatedProducts) {
      try {
        await prisma.productRelation.create({
          data: {
            productId: mainProduct.id,
            relatedProductId: related.id,
            relationType: "similar",
          },
        });
        relationCount++;
      } catch (error) {
      console.error("Error:", error);
        // Ignore duplicate relation errors
      }
    }
  }

  console.log(`🔗 Created ${relationCount} product relationships`);

  // Final summary
  const totalProducts = await prisma.product.count({
    where: { deletedAt: null },
  });
  const totalBrands = await prisma.brand.count();
  const totalCategories = await prisma.category.count();

  console.log("\n📊 FINAL INVENTORY SUMMARY:");
  console.log(`   📦 Total Products: ${totalProducts}`);
  console.log(`   🏷️  Total Brands: ${totalBrands}`);
  console.log(`   📂 Total Categories: ${totalCategories}`);
  console.log(`   🔗 Product Relations: ${relationCount}`);
  console.log("\n✨ Product generation complete!");
}

async function main() {
  try {
    await generateProducts();
  } catch (error) {
      console.error("Error:", error);
    console.error("❌ Error generating products:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
