import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to:", connectionString ? connectionString.split('@')[1] : "NOT FOUND");

const sql = neon(connectionString);

async function main() {
  try {
    const result = await sql`SELECT id, name, email, role, "storeName" FROM "User" LIMIT 10`;
    console.log("Success! Users:");
    console.log(result);
  } catch (error) {
    console.error("Error connecting via Neon Serverless:", error);
  }
}

main();
