import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9C4DXWRhvBUo@ep-soft-water-amzwjl9k-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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
