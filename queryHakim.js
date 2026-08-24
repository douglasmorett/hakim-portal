import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT * FROM \"User\" LIMIT 10")
  .then(res => {
    console.log("All users:");
    console.dir(res.rows, { maxArrayLength: null });
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
