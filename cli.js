#!/usr/bin/env bun

import { parseArgs } from "util";
import { migrate } from ".";

async function cli() {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      help: { type: "boolean", short: "h" },
      connectionString: { type: "string", short: "c" },
      includes: { type: "string", short: "i" },
      migrationDir: { type: "string", short: "d" },
    },
    strict: false,
    allowPositionals: true,
  });

  const command = positionals[2]; // First positional after script name

  if (values.help || !command) {
    console.log(`
Bun Migration Tool

Assumes bun.sh environment variables to connect to correct database or connectionOptions which can simply be a connection string.
Usage: bunx bun-migrate up [options]

Commands:
  up     Run pending migrations
  help   

Options:
  connectionOptions: { type: "string", short: "c" },
  includes: { type: "string", short: "i" },
  migrationDir: { type: "string", short: "d" },
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case "up": {
        await migrate(values);
        break;
      }

      default: {
        console.error(`Unknown command: ${command}`);
        console.log("Run with --help for usage information");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

await cli();
