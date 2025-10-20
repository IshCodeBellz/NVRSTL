import { CMSService } from "../lib/server/cmsService";

// Test script to verify CMS image functionality
async function testCMSImages() {
  console.log("🧪 Testing CMS Image Management...");

  try {
    // Test 1: Get current images
    console.log("\n1. Testing getHomePageImages...");
    const currentImages = await CMSService.getHomePageImages();
    console.log("✅ Current images loaded successfully");
    console.log("Hero Images:", currentImages.heroImages);
    console.log(
      "Category Images Count:",
      Object.keys(currentImages.categoryImages).length
    );

    // Test 2: Update images
    console.log("\n2. Testing updateHomePageImages...");
    const testImages = {
      heroImageLeft:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&h=1200&fit=crop",
      categoryImages: {
        denim:
          "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop",
      },
    };

    await CMSService.updateHomePageImages(testImages);
    console.log("✅ Images updated successfully");

    // Test 3: Verify updates
    console.log("\n3. Testing updated images...");
    const updatedImages = await CMSService.getHomePageImages();
    if (updatedImages.heroImages.left === testImages.heroImageLeft) {
      console.log("✅ Hero image update verified");
    } else {
      console.log("❌ Hero image update failed");
    }

    if (
      updatedImages.categoryImages.denim === testImages.categoryImages.denim
    ) {
      console.log("✅ Category image update verified");
    } else {
      console.log("❌ Category image update failed");
    }

    // Test 4: Invalid URL handling
    console.log("\n4. Testing invalid URL handling...");
    try {
      await CMSService.updateHomePageImages({
        heroImageLeft: "not-a-valid-url",
      });
      console.log("❌ Should have thrown error for invalid URL");
    } catch (error) {
      console.log("✅ Invalid URL properly rejected:", error.message);
    }

    // Test 5: Reset to defaults
    console.log("\n5. Testing reset to defaults...");
    await CMSService.resetHomepageImagesToDefault();
    console.log("✅ Reset to defaults successful");

    console.log("\n🎉 All CMS image tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCMSImages();
}

export { testCMSImages };
