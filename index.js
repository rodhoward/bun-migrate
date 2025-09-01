import { SQL } from "bun";

const createHash = (content) => {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return hasher.digest("hex"); // Returns hex string directly
};

const ensureTable = async (bunSql) => {
  await bunSql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        hash VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
};

const getLastExecuted = async (bunSql) => {
  const [row] = await bunSql`SELECT max(id) as last FROM migrations`;
  return row?.last ?? 0;
};

const up = async ({ id, name, content, bunSql }) => {
  const hash = createHash(content);
  if (content.match(/^\s*--\s*postgres-migrations disable-transaction.*/)) {
    const statements = content.split(/;\s*[\r\n]+/);
    // Execute each statement individually (no implicit transaction)
    for (const statement of statements) {
      await bunSql.unsafe(statement);
    }
    // Record it
    await bunSql`INSERT INTO migrations (id, name, hash) VALUES (${id}, ${name}, ${hash})`;
  } else {
    await bunSql.begin(async (sql) => {
      // Execute the migration SQL
      await sql.unsafe(content); // Use unsafe for raw SQL
      // Record it
      await sql`INSERT INTO migrations (id, name, hash) VALUES (${id}, ${name}, ${hash})`;
    });
  }
  console.log(`✓ Migrated ${name}`);
};

const checkFileHash = async ({ id, fileName, content, bunSql }) => {
  const [{ hash }] = await bunSql`SELECT hash from migrations where id = ${id}`;
  if (hash !== createHash(content)) {
    throw new Error(
      `Migration files should be immutable, they should not change. '${fileName}' has changed.`
    );
  }
};

const migrate = async ({
  migrationDir = "./migrations",
  includes = "**/*.sql",
  connectionString,
}) => {
  // Initialize Bun's SQL client
  const bunSql = connectionString ? new SQL(connectionString) : new SQL();

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
    const content = await Bun.file(`${migrationDir}/${fileName}`).text();

    if (lastId >= id) {
      await checkFileHash({ id, fileName, content, bunSql });
      continue;
    }
    if (id > lastId + 1)
      throw new Error(
        `Migration file names must be sequential. Missing ${lastId + 1}`
      );

    await up({ id, name: fileName, content, bunSql });
    lastId = id;
  }
  let finalId = await getLastExecuted(bunSql);
  console.log(`Migrations complete. Last migration id: ${finalId}`);
};

export { migrate };
