
const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        failedLoginAttempts: true,
        lastLoginAt: true,
        lockedAt: true,
      },
      take: 5,
    });
    
    console.log('�� Users in database:', users.length);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'})`);
      console.log(`   Failed attempts: ${user.failedLoginAttempts}`);
      console.log(`   Last login: ${user.lastLoginAt ? user.lastLoginAt.toISOString() : 'Never'}`);
      console.log(`   Locked: ${user.lockedAt ? 'Yes - ' + user.lockedAt.toISOString() : 'No'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

