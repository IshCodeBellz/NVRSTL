
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const prisma = new PrismaClient();
  
  try {
    // Check if test user exists
    const existing = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (existing) {
      console.log('Test user already exists:', existing.email);
      console.log('Failed attempts:', existing.failedLoginAttempts);
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: hashedPassword,
        failedLoginAttempts: 0,
        emailVerified: new Date(),
      }
    });
    
    console.log('Created test user:', user.email);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

