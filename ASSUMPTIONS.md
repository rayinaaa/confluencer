# Architectural & Business Assumptions

This document outlines the core domain assumptions, architectural trade-offs, and technical considerations established for the **Transaction Ledger API** submission.

---

### 1. Currency Precision & Floating-Point Representation
- **Precision Standard**: All monetary amounts are handled up to **2 decimal places** (cents / standard fractional currency units).
- **Validation**: Inputs with more than two decimal digits (e.g., `10.555`) are rejected with `400 Bad Request` at the validation boundary via Zod schema rules.
- **Floating-Point Arithmetic**: To prevent IEEE-754 floating-point precision drift (e.g., `0.1 + 0.2 = 0.30000000000000004`), all balances are mathematically rounded to 2 decimal places using `Number(val.toFixed(2))` during arithmetic operations. In enterprise banking systems, an arbitrary-precision integer representation (storing minor currency units / cents as integers) or Decimal128 is typically employed; SQLite's REAL with 2-decimal rounding offers a clean balance of developer accessibility and mathematical correctness for this assessment.

---

### 2. Account Initialization & Balance Enforcement
- **Initial Balance Policy**: As explicitly required by the prompt ("Initial balance must always be 0", "The client should not be allowed to set the initial balance"):
  - When creating an account via `POST /api/v1/accounts`, if a client passes a `balance` field in the request payload, the request is rejected with `400 Bad Request: Client is not allowed to set initial balance`.
  - Accounts are guaranteed to start at exactly `0.00`.
- **Account Identification**: Account identifiers (`id`) are generated as RFC-4122 compliant **UUIDv4** strings using Node.js crypto subsystem, guaranteeing global uniqueness.

---

### 3. Idempotency & Reference ID Scope
- **Scope of Uniqueness**: In accordance with the prompt specification:
  - *"For the same account, reference_id must be unique."*
  - *"The same reference_id may be used for different accounts."*
- **Database Constraint**: This rule is enforced at both the business service layer and database schema level using a composite unique constraint:
  ```sql
  CONSTRAINT uq_account_reference UNIQUE (account_id, reference_id)
  ```
- **Duplicate Handling**: If a duplicate `reference_id` is submitted for the same account:
  - No new transaction is written.
  - The account balance is not changed.
  - The API responds with `HTTP 409 Conflict` and error code `DUPLICATE_TRANSACTION_REFERENCE`, referencing the existing transaction.

---

### 4. Overdraft & Insufficient Balance Policy
- **No Negative Balances**: Overdraft protection is strictly active. A debit transaction is rejected if `account.balance < transaction.amount`.
- **Status Code**: Rejections return `HTTP 422 Unprocessable Entity` with error code `INSUFFICIENT_FUNDS` and details of the current balance and requested debit.
- **Defense in Depth**: Even if application validation were bypassed, the SQLite database table defines:
  ```sql
  CHECK (balance >= 0)
  ```
  preventing any database write from forcing an account balance below zero.

---

### 5. Strict Ledger Immutability
- **Standard Accounting Principles**: Real-world ledgers never delete or mutate historical financial entries.
- **Endpoint Enforcement**: 
  - No `PUT`, `PATCH`, or `DELETE` endpoints are permitted for transactions.
  - Attempting to modify or remove existing transactions yields `HTTP 405 Method Not Allowed`.
  - Any balance adjustments must be executed as new, forward-only offsetting transactions (e.g. credit refund or reversal).

---

### 6. Atomicity & Concurrency Model
- **ACID Transactions**: Each transaction operation updates the account balance and inserts the transaction record inside a single database transaction:
  ```ts
  const executeTx = db.transaction(() => { ... });
  ```
- **Rollback Guarantee**: In `better-sqlite3`, `db.transaction()` executes inside `BEGIN IMMEDIATE`. If any error occurs (validation check, check constraint, duplicate key, or power interruption), SQLite automatically triggers a `ROLLBACK`, leaving zero orphan records or partial balance modifications.
- **Write-Ahead Logging (WAL)**: The SQLite engine is initialized with `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`, enabling high-performance concurrent reads while ensuring serializable atomic writes.

---

### 7. Pagination and History Queries
- **Indexing**: 1-based pagination is used (`page >= 1`, `limit` between 1 and 100). Default limit is `10`.
- **Ordering**: History results are ordered by `created_at DESC, id DESC` to guarantee stable latest-first chronological ordering.
- **Composite Indexing**: Queries are backed by SQLite composite indexes:
  - `idx_transactions_account_created ON transactions(account_id, created_at DESC)`
  - `idx_transactions_account_type ON transactions(account_id, type)`

---

### 8. Bonus Feature: Inter-Account Money Transfer
- **Semantics**: Money transfer between Account A and Account B is executed as a unified atomic transaction consisting of:
  1. Source account balance debit.
  2. Destination account balance credit.
  3. Source ledger debit entry (`TRF-<ref>-OUT`).
  4. Destination ledger credit entry (`TRF-<ref>-IN`).
  5. Transfer audit log record in `transfers` table.
- **Rollback Safety**: If the destination account does not exist or source funds are insufficient, the entire operation is rolled back and neither account balance changes.
- **Self-Transfer Prevention**: Transfers between the same account (`source == destination`) are rejected at the schema level (`CHECK (source_account_id != destination_account_id)`).
