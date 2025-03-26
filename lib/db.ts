import { SSM } from "aws-sdk";
import postgres from "postgres";

// Fetch AWS SSM Parameters before anything else
const region = process.env.AWS_REGION || "eu-north-1";
const ssm = new SSM({ region });

async function getDatabaseCredentials() {
  const [username, password, endpoint] = await Promise.all([
    ssm.getParameter({ Name: "/project-two/db/username" }).promise(),
    ssm
      .getParameter({
        Name: "/project-two/db/password",
        WithDecryption: true,
      })
      .promise(),
    ssm.getParameter({ Name: "/project-two/db/endpoint" }).promise(),
  ]);

  return {
    host: endpoint.Parameter?.Value || "localhost",
    database: "mydb",
    username: username.Parameter?.Value || "myuser",
    password: password.Parameter?.Value || "mypassword",
  };
}

// Immediately run the SQL creation script before initializing the DB connection
async function initializeDatabase() {
  const dbCredentials = await getDatabaseCredentials();
  console.log(dbCredentials);
  // Import postgres dynamically AFTER fetching credentials
  const postgres = (await import("postgres")).default;

  const sql = postgres({
    host: dbCredentials.host,
    database: dbCredentials.database,
    username: dbCredentials.username,
    password: dbCredentials.password,
    ssl: { rejectUnauthorized: false },
  });

  // Run the table creation query
  await sql`
    CREATE TABLE IF NOT EXISTS "Image" (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  return sql;
}

// Export a function to get the database connection
let sqlInstance: ReturnType<typeof postgres> | null = null;

async function getDatabase() {
  if (!sqlInstance) {
    sqlInstance = await initializeDatabase();
  }
  return sqlInstance;
}

export { getDatabase };
