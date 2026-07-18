import { neon } from '@neondatabase/serverless';

const connectionString = "postgresql://neondb_owner:npg_9C4DXWRhvBUo@ep-soft-water-amzwjl9k.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";
console.log("Connecting to:", connectionString.split('@')[1]);

const sql = neon(connectionString);

async function main() {
  try {
    const result = await sql`SELECT id, name, email, role, "storeName" FROM "User" LIMIT 10`;
    console.log("Success! Users:");
    console.log(result);
  } catch (error) {
    console.error("Error connecting via Neon Serverless (no pooler):", error);
  }
}

main();
