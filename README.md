# bun-migrate

Based loosely on [postgres-migrations](https://www.npmjs.com/package/postgres-migrations) but instead of requiring pg postgres client it simply uses the bun.sh built in client. You can setup environment variables or pass in a connectionString manually. So for example `DATABASE_URL="postgres://user:pw@localhost:5432/database" bunx bun-migrate up`.

Follows [postgres-migrations](https://www.npmjs.com/package/postgres-migrations) simple but powerful ideas:

1. No rollback. Simply roll forward! In production this is a safer more streamlined approach when compared with always developing a _working_ rollback when its basically never used.
2. Migrations are sequenced by a simple integer id at the start of the migration's file name. Id's can't be skipped or repeated. Highlights the pitfalls of using time stamps when merging different branches.
3. A transaction is created for each migration if you are creating indexes that can't be run in a transaction you can turn them off. By including `-- postgres-migrations disable-transaction` at the top of the file.
4. Using a file hash to ensure that migrations aren't updated. In development you can simply delete the row from the migration table to run again.
5. Concurrency, using postgres advisory locks id 765432 to ensure only one client is running migrations while other clients will block waiting before terminating once migrations are complete.

## Options

Migrate (up) takes three options:

- **migrationDir** Defaults to "migrations" its the directory where you want to store your migration files.
- **includes** Glob pattern defaults to "\*_/_.sql" this searches for migration files inside your migration directory.
- **connectionString** Falls back to using your environment variables but if set will be used instead.

In action:
`bunx bun-migrate up --migrationDir=test-migrations --connectionString="postgres://user:pw@localhost:5432/database"`

## Limitations

This is a very basic implementation atm. There are probably a ton of things that haven't been considered. Short list of things that would be nice to have in the future:

1. Javascript migrations.. postgres-migrations allows for executing javascript atm I haven't implemented this.. although it would be nice. ATM each migration must be .sql.
1. Supporting mysql as well wouldn't be much work and might be nice.
