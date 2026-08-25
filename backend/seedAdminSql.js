require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function main() {
  console.log('Seeding admin user via raw SQL...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();

  try {
    // 1. Create ADMIN role
    const roleId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const roleRes = await client.query(
      `INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [roleId, 'ADMIN', 'System Administrator', now, now]
    );
    const finalRoleId = roleRes.rows[0].id;

    // 2. Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // 3. Create Admin User
    const userId = crypto.randomUUID();
    const userRes = await client.query(
      `INSERT INTO "User" (id, email, "passwordHash", name, "roleId", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash" RETURNING id, email`,
      [userId, 'admin@estatesync.com', passwordHash, 'System Admin', finalRoleId, now, now]
    );
    const finalUserId = userRes.rows[0].id;
    const email = userRes.rows[0].email;

    // 4. Create Wallet if not exists
    const walletId = crypto.randomUUID();
    await client.query(
      `INSERT INTO "Wallet" (id, "userId", "totalAllocated", "totalSpent", "availableBalance", "createdAt", "updatedAt") 
       VALUES ($1, $2, 0, 0, 0, $3, $4) 
       ON CONFLICT ("userId") DO NOTHING`,
      [walletId, finalUserId, now, now]
    );

    console.log('Admin user created successfully:');
    console.log('Email:', email);
    console.log('Password: admin123');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await client.end();
  }
}

main();
