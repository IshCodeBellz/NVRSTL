#!/usr/bin/env tsx

import { CMSService } from "../lib/server/cmsService";

async function main() {
  try {
    console.log("Initializing default category sections...");

    await CMSService.initializeDefaultCategorySections();

    console.log("✅ Default category sections initialized successfully!");

    // Fetch and display the created sections
    const sections = await CMSService.getCategorySections();
    console.log(`\nCreated ${sections.length} sections:`);
    sections.forEach((section, index) => {
      console.log(
        `${index + 1}. ${section.title} (${section.slug}) - ${
          section.cards.length
        } cards`
      );
      section.cards.forEach((card, cardIndex) => {
        console.log(`   ${cardIndex + 1}. ${card.title} (${card.slug})`);
      });
    });
  } catch (error) {
    console.error("❌ Error initializing category sections:", error);
    process.exit(1);
  }
}

main();
