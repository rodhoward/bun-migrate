import { sql } from "bun";

const ensureTable = async (bunSql) => {
  await bunSql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
};

const getLastExecuted = async (bunSql) => {
  const [row] = await bunSql`SELECT max(id) as last FROM migrations`;
  return row?.last ?? 0;
};

const up = async ({ id, name, content, bunSql }) => {
  if (content.match(/^\s*--\s*postgres-migrations disable-transaction/)) {
    await sql.unsafe(content); // Use unsafe for raw SQL
    // Record it
    await sql`INSERT INTO migrations (id, name) VALUES (${id}, ${name})`;
  } else {
    await bunSql.begin(async (sql) => {
      // Execute the migration SQL
      await sql.unsafe(content); // Use unsafe for raw SQL
      // Record it
      await sql`INSERT INTO migrations (id, name) VALUES (${id}, ${name})`;
    });
  }
  console.log(`✓ Migrated ${name}`);
};

const migrate = async ({
  migrationDir = "./migrations",
  includes = "**/*.sql",
  connectionString,
}) => {
  // Initialize Bun's SQL client
  const bunSql = connectionString ? sql(connectionString) : sql;
  await ensureTable(bunSql);

  // Get all SQL files
  const glob = new Bun.Glob(includes);
  const files = Array.from(glob.scanSync(migrationDir))
    .sort()
    .map((file) => {
      const id = file.match(/^\d+(-_ )*/)?.[0];
      if (!Number.isInteger(+id)) {
        throw new Error(
          `Migration file names must start with their simple sequence number. Not '${file}'`
        );
      }
      return { id: Number.parseInt(id), fileName: file };
    });

  let lastId = await getLastExecuted(bunSql);
  for (const { id, fileName } of files) {
    if (lastId >= id) continue;
    if (id > lastId + 1)
      throw new Error(
        `Migration file names must be sequential. Missing ${lastId + 1}`
      );

    const content = await Bun.file(`${migrationDir}/${fileName}`).text();
    await up({ id, name: fileName, content, bunSql });
    lastId = id;
  }
  let finalId = await getLastExecuted(bunSql);
  console.log(`Migrations complete. Last migration id: ${finalId}`);
};

export { migrate };
