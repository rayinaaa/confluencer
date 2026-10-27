-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0 CHECK (balance >= 0),
    created_at TEXT NOT NULL
);

-- Transactions table (Strictly Immutable Ledger)
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

-- Index for fast query of account transactions sorted by latest first
CREATE INDEX IF NOT EXISTS idx_transactions_account_created 
    ON transactions(account_id, created_at DESC);

-- Index for filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_transactions_account_type 
    ON transactions(account_id, type);

-- Bonus: Transfers audit log
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
