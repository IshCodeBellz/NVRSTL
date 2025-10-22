#!/usr/bin/env node

/**
 * Favicon Generation Script for NVRSTL
 *
 * This script helps generate favicon files from a source image.
 *
 * Usage:
 * 1. Place your source image (PNG/SVG) in this directory as 'source.png' or 'source.svg'
 * 2. Run: node generate-favicons.js
 * 3. The generated files will be copied to the public/ directory
 *
 * Requirements:
 * - ImageMagick (for PNG conversion)
 * - Node.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const sourceDir = __dirname;
const publicDir = path.join(__dirname, "..", "public");

// Check if ImageMagick is available
function checkImageMagick() {
  try {
    execSync("magick -version", { stdio: "ignore" });
    return true;
  } catch (error) {
    console.log(
      "ImageMagick not found. Please install ImageMagick to generate favicon files."
    );
    console.log(
      "Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Ubuntu)"
    );
    return false;
  }
}

// Generate favicon files
function generateFavicons() {
  const sourceFiles = ["source.png", "source.svg", "source.jpg", "source.jpeg"];
  let sourceFile = null;

  // Find source file
  for (const file of sourceFiles) {
    if (fs.existsSync(path.join(sourceDir, file))) {
      sourceFile = file;
      break;
    }
  }

  if (!sourceFile) {
    console.log(
      "No source image found. Please place your source image as one of:"
    );
    console.log("- source.png");
    console.log("- source.svg");
    console.log("- source.jpg");
    console.log("- source.jpeg");
    return;
  }

  console.log(`Found source image: ${sourceFile}`);

  if (!checkImageMagick()) {
    return;
  }

  const sizes = [
    { size: "16x16", name: "favicon-16x16.png" },
    { size: "32x32", name: "favicon-32x32.png" },
    { size: "180x180", name: "apple-touch-icon.png" },
    { size: "192x192", name: "android-chrome-192x192.png" },
    { size: "512x512", name: "android-chrome-512x512.png" },
  ];

  console.log("Generating favicon files...");

  sizes.forEach(({ size, name }) => {
    try {
      const inputPath = path.join(sourceDir, sourceFile);
      const outputPath = path.join(publicDir, name);

      execSync(`magick "${inputPath}" -resize ${size} "${outputPath}"`, {
        stdio: "inherit",
      });
      console.log(`✓ Generated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  });

  // Generate favicon.ico (32x32)
  try {
    const inputPath = path.join(sourceDir, sourceFile);
    const outputPath = path.join(publicDir, "favicon.ico");

    execSync(`magick "${inputPath}" -resize 32x32 "${outputPath}"`, {
      stdio: "inherit",
    });
    console.log("✓ Generated favicon.ico");
  } catch (error) {
    console.error("✗ Failed to generate favicon.ico:", error.message);
  }

  console.log("\nFavicon generation complete!");
  console.log("Files have been placed in the public/ directory.");
  console.log("\nNext steps:");
  console.log("1. Test the favicon in your browser");
  console.log("2. Update the theme_color in site.webmanifest if needed");
  console.log("3. Create safari-pinned-tab.svg for Safari pinned tabs");
}

// Run the script
generateFavicons();
