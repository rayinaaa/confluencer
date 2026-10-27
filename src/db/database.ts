import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

let dbInstance: Database.Database | null = null;

export function getDatabase(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || (config.isTest ? ':memory:' : config.dbPath);
  const db = new Database(dbPath);

  // Enable foreign keys and WAL mode for high concurrency and consistency
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  // Apply schema
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'schema.sql'
  );

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);
  } else {
    // Fallback if schema.sql isn't directly reachable in bundled environment
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= 0),
          created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
          amount REAL NOT NULL CHECK (amount > 0),
          description TEXT,
          reference_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          CONSTRAINT uq_account_reference UNIQUE (account_id, reference_id)
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_account_created ON transactions(account_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_account_type ON transactions(account_id, type);
      CREATE TABLE IF NOT EXISTS transfers (
          id TEXT PRIMARY KEY,
          source_account_id TEXT NOT NULL,
          destination_account_id TEXT NOT NULL,
          amount REAL NOT NULL CHECK (amount > 0),
          reference_id TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          CHECK (source_account_id != destination_account_id)
      );
    `);
  }

  if (!customPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DELETE FROM transfers;
    DELETE FROM transactions;
    DELETE FROM accounts;
  `);
}
