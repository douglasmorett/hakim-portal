import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined in process.env!");
  process.exit(1);
}

// Mostra informações seguras da conexão
const urlObj = new URL(connectionString);
console.log("Host:", urlObj.host);
console.log("User:", urlObj.username);
console.log("Password length:", urlObj.password.length);
console.log("Password starts with:", urlObj.password.substring(0, 4));

const sql = neon(connectionString);

async function main() {
  try {
    const result = await sql`SELECT id, name, email, role, "storeName" FROM "User" LIMIT 5`;
    console.log("Success! Users found:", result.length);
    console.log(result);
  } catch (error) {
    console.error("Error connecting via Neon Serverless Pure:", error);
  }
}

main();
