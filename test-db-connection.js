const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT version()`;
    console.log('✅ Database connection successful!');
    console.log('PostgreSQL version:', result[0].version);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();