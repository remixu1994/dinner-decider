import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const databasePath = path.join(rootDir, "data", "dinner-decider.sqlite");
const backupDir = path.join(rootDir, "data", "backups");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const hasDatabase = fs.existsSync(databasePath) && fs.statSync(databasePath).size > 0;

function runCommand(command, input) {
  return spawnSync(command, {
    cwd: rootDir,
    encoding: "utf8",
    shell: true,
    input,
  });
}

function runDiff(fromExistingDatabase) {
  return runCommand(
    fromExistingDatabase
      ? "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script"
      : "npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
  );
}

let diff = runDiff(hasDatabase);

if (diff.status !== 0 && hasDatabase) {
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `dinner-decider-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
  );
  fs.copyFileSync(databasePath, backupPath);
  fs.rmSync(databasePath, { force: true });
  process.stdout.write(
    `Existing database was backed up to ${backupPath} before schema reset.\n`,
  );
  diff = runDiff(false);
}

if (diff.status !== 0) {
  process.stderr.write(diff.stderr || diff.stdout || "Failed to diff Prisma schema.\n");
  process.exit(diff.status ?? 1);
}

const sql = (diff.stdout || "").trim();

if (!sql) {
  process.stdout.write("Database schema is already up to date.\n");
  process.exit(0);
}

const execute = runCommand("npx prisma db execute --stdin", sql);

if (execute.status !== 0) {
  process.stderr.write(
    execute.stderr || execute.stdout || "Failed to execute Prisma SQL.\n",
  );
  process.exit(execute.status ?? 1);
}

if (execute.stdout) {
  process.stdout.write(execute.stdout);
} else {
  process.stdout.write("Database schema synced.\n");
}
