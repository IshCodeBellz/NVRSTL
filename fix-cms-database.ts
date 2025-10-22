#!/usr/bin/env tsx

/**
 * CMS Database Fix Script
 * 
 * This script checks if CMS tables exist and initializes them if missing.
 * Run this in production to fix CMS save/update issues.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCMSTables() {
  console.log('🔍 Checking CMS database tables...');
  
  try {
    // Check if CategorySection table exists
    const categorySections = await prisma.categorySection.findMany({
      take: 1
    });
    console.log('✅ CategorySection table exists');
    
    // Check if CategoryCard table exists
    const categoryCards = await prisma.categoryCard.findMany({
      take: 1
    });
    console.log('✅ CategoryCard table exists');
    
    // Check if SiteSettings table exists
    const siteSettings = await prisma.siteSettings.findMany({
      take: 1
    });
    console.log('✅ SiteSettings table exists');
    
    return true;
  } catch (error) {
    console.error('❌ CMS tables missing or error:', error);
    return false;
  }
}

async function initializeCMSData() {
  console.log('🚀 Initializing CMS data...');
  
  try {
    // Check if we already have category sections
    const existingSections = await prisma.categorySection.count();
    
    if (existingSections === 0) {
      console.log('📝 Creating default category sections...');
      
      // Create Services section
      const servicesSection = await prisma.categorySection.create({
        data: {
          title: 'Services',
          slug: 'services',
          description: 'Our core service categories',
          displayOrder: 0,
        }
      });
      
      // Create The Reason section
      const reasonSection = await prisma.categorySection.create({
        data: {
          title: 'The Reason',
          slug: 'the-reason',
          description: 'Why choose us',
          displayOrder: 1,
        }
      });
      
      console.log('✅ Created category sections');
      
      // Create cards for Services section
      const servicesCards = [
        { title: 'Jerseys', slug: 'jerseys', displayOrder: 0 },
        { title: 'Athletic', slug: 'athletic', displayOrder: 1 },
        { title: 'Casual', slug: 'casual', displayOrder: 2 },
        { title: 'Formal', slug: 'formal', displayOrder: 3 },
        { title: 'Streetwear', slug: 'streetwear', displayOrder: 4 },
        { title: 'Vintage', slug: 'vintage', displayOrder: 5 },
      ];
      
      for (const card of servicesCards) {
        await prisma.categoryCard.create({
          data: {
            sectionId: servicesSection.id,
            title: card.title,
            slug: card.slug,
            displayOrder: card.displayOrder,
          }
        });
      }
      
      // Create cards for The Reason section
      const reasonCards = [
        { title: 'Limited Edition', slug: 'limited', displayOrder: 0 },
        { title: 'Exclusive', slug: 'exclusive', displayOrder: 1 },
        { title: 'Premium', slug: 'premium', displayOrder: 2 },
        { title: 'Sustainable', slug: 'sustainable', displayOrder: 3 },
        { title: 'Artisan', slug: 'artisan', displayOrder: 4 },
        { title: 'Custom', slug: 'custom', displayOrder: 5 },
      ];
      
      for (const card of reasonCards) {
        await prisma.categoryCard.create({
          data: {
            sectionId: reasonSection.id,
            title: card.title,
            slug: card.slug,
            displayOrder: card.displayOrder,
          }
        });
      }
      
      console.log('✅ Created category cards');
    } else {
      console.log('ℹ️ Category sections already exist');
    }
    
    // Initialize default site settings for homepage images
    const defaultSettings = [
      { key: 'heroImageLeft', value: 'https://picsum.photos/900/1200', type: 'text', description: 'Left hero image URL' },
      { key: 'heroImageRight', value: 'https://picsum.photos/901/1200', type: 'text', description: 'Right hero image URL' },
      { key: 'heroLayout', value: 'two-image', type: 'text', description: 'Hero layout type' },
      { key: 'categoryImageDenim', value: 'https://picsum.photos/400/300', type: 'text', description: 'Denim category image' },
      { key: 'categoryImageTops', value: 'https://picsum.photos/401/300', type: 'text', description: 'Tops category image' },
      { key: 'categoryImageShoes', value: 'https://picsum.photos/402/300', type: 'text', description: 'Shoes category image' },
      { key: 'categoryImageAccessories', value: 'https://picsum.photos/403/300', type: 'text', description: 'Accessories category image' },
      { key: 'leagueTitle', value: 'NVRSTL', type: 'text', description: 'League title' },
    ];
    
    for (const setting of defaultSettings) {
      await prisma.siteSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: setting.description,
        }
      });
    }
    
    console.log('✅ Initialized site settings');
    
  } catch (error) {
    console.error('❌ Error initializing CMS data:', error);
    throw error;
  }
}

async function testCMSOperations() {
  console.log('🧪 Testing CMS operations...');
  
  try {
    // Test reading category sections
    const sections = await prisma.categorySection.findMany({
      include: { cards: true }
    });
    console.log(`✅ Read ${sections.length} category sections`);
    
    // Test reading site settings
    const settings = await prisma.siteSettings.findMany();
    console.log(`✅ Read ${settings.length} site settings`);
    
    // Test updating a setting
    await prisma.siteSettings.update({
      where: { key: 'heroImageLeft' },
      data: { value: 'https://picsum.photos/900/1200' }
    });
    console.log('✅ Updated site setting');
    
    return true;
  } catch (error) {
    console.error('❌ CMS operations test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 CMS Database Fix Script');
  console.log('==========================');
  
  try {
    // Check if tables exist
    const tablesExist = await checkCMSTables();
    
    if (!tablesExist) {
      console.log('❌ CMS tables are missing. Please run database migrations first:');
      console.log('   npx prisma migrate deploy');
      process.exit(1);
    }
    
    // Initialize data
    await initializeCMSData();
    
    // Test operations
    const operationsWork = await testCMSOperations();
    
    if (operationsWork) {
      console.log('🎉 CMS database is ready!');
      console.log('✅ Category Sections and Homepage Images should now save properly.');
    } else {
      console.log('❌ CMS operations still failing. Check database permissions.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(console.error);
