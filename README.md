# Transaction Ledger API & System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-ACID%20Engine-003B57.svg)](https://www.sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-23%20Passed%20(100%25)-brightgreen.svg)]()
[![Bonus](https://img.shields.io/badge/Bonus-Money%20Transfer%20Included-orange.svg)]()

> A robust, production-grade Transaction Ledger system developed for the **Full Stack Developer Assessment** (Walnut Folks / Confluencr / Kalakaar / Intent Farm). Built with **Node.js**, **Express**, **TypeScript**, and **SQLite** with full ACID atomicity, double-entry guarantees, and strict ledger immutability.

---

## 🌟 Quick Links

- **Interactive Swagger Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Interactive Web Dashboard**: [http://localhost:3000/](http://localhost:3000/)
- **API Documentation File**: [API_DOCUMENTATION.md](file:///c:/Users/rayin/OneDrive/Desktop/Confluencer/API_DOCUMENTATION.md)
- **Architecture & Domain Assumptions**: [ASSUMPTIONS.md](file:///c:/Users/rayin/OneDrive/Desktop/Confluencer/ASSUMPTIONS.md)

---

## 📋 Features & Compliance Matrix

| Requirement | Assessment Specification | Implementation Details | Status |
|:---|:---|:---|:---:|
| **1. Create Account** | Unique ID, name required, initial balance strictly 0, system-generated timestamp. | UUIDv4, Zod schema rejects client-supplied initial balance, auto-timestamps. | ✅ Complete |
| **2. Add Transaction** | Credit & Debit support, balance update, overdraft rejection. | Atomic credit/debit with exact 2-decimal arithmetic and overdraft prevention. | ✅ Complete |
| **Duplicate Prevention** | `reference_id` must be unique per account; reusable across accounts. | Composite DB constraint `UNIQUE(account_id, reference_id)` returning `409 Conflict`. | ✅ Complete |
| **3. Account Balance** | Fetch current balance, return 404 for missing account. | `GET /api/v1/accounts/:id/balance` with verified balance check. | ✅ Complete |
| **4. History & Pagination** | Filter by `type` (credit/debit/all), pagination metadata, latest-first ordering. | Paginated query with `total_records`, `total_pages`, ordered by `created_at DESC`. | ✅ Complete |
| **5. Data Integrity** | Ledger immutability, zero ledger mutation, balance consistency. | `PUT`, `PATCH`, `DELETE` return `405 Method Not Allowed`. Audit endpoint verifies math. | ✅ Complete |
| **6. Atomicity** | Atomic balance update and transaction logging with rollback. | Wrapped in SQLite `db.transaction()` (`BEGIN IMMEDIATE` + auto rollback). | ✅ Complete |
| **7. Validations** | Deep input validation with proper status codes. | Zod 4 schemas with descriptive error details and validation error codes. | ✅ Complete |
| **8. Error Handling** | Consistent JSON error format with appropriate HTTP codes. | Centralized error middleware with standardized error responses. | ✅ Complete |
| **9. Bonus: Money Transfer** | Atomic cross-account transfer with dual ledger entries & rollback. | `POST /api/v1/transfers` executing dual entries inside a single atomic transaction. | 🌟 Complete |
| **10. Web Dashboard** | Interactive UI for visualization. | Responsive, dark-mode financial dashboard with live simulator and ledger audit. | 🚀 Complete |

---

## 🏗️ Architecture & Project Structure

The project follows a clean, decoupled **Layered Architecture** adhering to separation of concerns:

```
Confluencer/
├── src/
│   ├── config/             # Environment variable configuration
│   │   └── index.ts
│   ├── db/                 # SQLite connection manager, WAL mode, migrations
│   │   ├── database.ts
│   │   └── schema.sql
│   ├── types/              # Domain models, DTOs, and interface definitions
│   │   └── index.ts
│   ├── errors/             # Standardized domain error classes (AppError)
│   │   └── AppError.ts
│   ├── middlewares/        # Validation & error handling middleware
│   │   ├── validate.ts     # Zod request validators
│   │   └── errorHandler.ts # Global error responder
│   ├── repositories/       # Data Access Layer (SQL queries and prepared statements)
│   │   ├── accountRepository.ts
│   │   ├── transactionRepository.ts
│   │   └── transferRepository.ts
│   ├── services/           # Business Logic Layer (ACID transactions, balance checks)
│   │   ├── accountService.ts
│   │   ├── transactionService.ts
│   │   └── transferService.ts
│   ├── controllers/        # HTTP Handlers
│   │   ├── accountController.ts
│   │   ├── transactionController.ts
│   │   └── transferController.ts
│   ├── routes/             # Express API Routers
│   │   ├── accountRoutes.ts
│   │   ├── transactionRoutes.ts
│   │   ├── transferRoutes.ts
│   │   └── index.ts
│   ├── docs/               # OpenAPI 3.0 / Swagger UI definition
│   │   └── swagger.ts
│   ├── public/             # Interactive Frontend Dashboard
│   │   ├── index.html
│   │   ├── css/style.css
│   │   └── js/app.js
│   ├── app.ts              # Express application factory
│   └── server.ts           # Server bootstrap and graceful shutdown
├── tests/                  # Automated Vitest test suite (23 tests)
│   ├── setup.ts            # In-memory DB isolation setup
│   ├── accounts.test.ts    # Account creation & balance tests
│   ├── transactions.test.ts# Credit, debit, overdraft, duplicate tests
│   ├── pagination.test.ts  # Pagination, sorting, and filter tests
│   ├── transfers.test.ts   # Bonus money transfer atomicity & rollback tests
│   └── integrity.test.ts   # Mathematical balance consistency & spec verification
├── API_DOCUMENTATION.md    # Detailed endpoint documentation with cURL examples
├── ASSUMPTIONS.md          # Explicit design and domain assumptions
├── package.json
└── tsconfig.json
```

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+ / v22+)
- **Language**: TypeScript (Strict Mode)
- **Framework**: Express.js (v5)
- **Database**: SQLite (via `better-sqlite3` with Write-Ahead Logging `WAL` and strict foreign keys)
- **Validation**: Zod 4
- **Documentation**: Swagger UI & OpenAPI 3.0
- **Testing**: Vitest + Supertest
- **Styling**: Vanilla CSS with custom glassmorphism design system

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v20 or higher) and npm installed:
```bash
node -v
npm -v
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
The server will start at:
- **Web Dashboard**: `http://localhost:3000/`
- **Swagger Documentation**: `http://localhost:3000/api-docs`
- **API Root**: `http://localhost:3000/api/v1`

### 4. Build & Production Run
To compile TypeScript and run the optimized production bundle:
```bash
npm run build
npm start
```

---

## 🧪 Running the Test Suite

The project includes **23 automated tests** verifying every requirement, edge case, validation rule, constraint, and atomicity scenario:

```bash
# Run all tests once
npm test

# Run tests in interactive watch mode
npm run test:watch
```

### Test Coverage Highlights:
- ✅ Account registration with default `0.00` balance.
- ✅ Rejection of client attempts to provide initial balance.
- ✅ Credit transactions increasing balance.
- ✅ Debit transactions decreasing balance.
- ✅ Overdraft protection: Debit exceeding balance is rejected with `422 Unprocessable Entity` while balance remains unchanged.
- ✅ Idempotency: Duplicate `reference_id` on the same account rejected with `409 Conflict`.
- ✅ Re-use of identical `reference_id` across different accounts is permitted.
- ✅ Pagination verification (`current_page`, `page_size`, `total_records`, `total_pages`).
- ✅ Latest-first chronological sorting based on `created_at`.
- ✅ Immutability verification: `PUT`, `PATCH`, `DELETE` operations on transactions return `405 Method Not Allowed`.
- ✅ **Bonus**: Atomic money transfer from Account A to B with dual ledger entries.
- ✅ **Bonus**: Money transfer rollback when source balance is insufficient or destination does not exist.
- ✅ Mathematical ledger integrity: `SUM(credits) - SUM(debits) === Stored Balance`.

---

## 💡 Quick Start Tutorial (cURL)

### 1. Create Two Accounts
```bash
# Create Account A
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Walker"}'

# Create Account B
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Dylan"}'
```

### 2. Credit Funds into Account A
```bash
curl -X POST http://localhost:3000/api/v1/accounts/<ALICE_ID>/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 200.00,
    "reference_id": "DEP-001",
    "description": "Initial funding"
  }'
```

### 3. Check Account Balance
```bash
curl http://localhost:3000/api/v1/accounts/<ALICE_ID>/balance
# Returns: {"success": true, "data": {"account_id": "<ALICE_ID>", "balance": 200.0}}
```

### 4. Perform an Atomic Money Transfer (Bonus Feature)
```bash
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "<ALICE_ID>",
    "destination_account_id": "<BOB_ID>",
    "amount": 75.00,
    "reference_id": "TRF-001",
    "description": "Consulting fee"
  }'
```
*Result: Alice's balance becomes $125.00, Bob's balance becomes $75.00.*

### 5. Inspect Transaction History
```bash
curl "http://localhost:3000/api/v1/accounts/<ALICE_ID>/transactions?page=1&limit=5"
```

---

## 🛡️ Database Constraints & Integrity Guarantees

Data consistency is enforced through a multi-tier defense:

1. **Schema Check Constraints**:
   - `accounts.balance >= 0`: Impossible for an account balance to become negative at the database level.
   - `transactions.amount > 0`: Zero or negative transaction amounts are rejected by SQLite.
   - `transfers.source_account_id != transfers.destination_account_id`: Self-transfers are disallowed.
2. **Foreign Key Integrity**:
   - `transactions.account_id` references `accounts.id` with `ON DELETE RESTRICT` to ensure ledger history can never be orphaned.
3. **Composite Uniqueness**:
   - `UNIQUE(account_id, reference_id)` strictly enforces single-account idempotency while permitting cross-account reference re-use.
4. **Isolated Transactions**:
   - Every balance update and transaction creation runs inside `db.transaction()` (`BEGIN IMMEDIATE`), guaranteeing zero dirty reads, lost updates, or phantom anomalies.

---

## 📄 Submission Checklist Verification

- [x] **Source Code**: Complete, clean, modular TypeScript codebase with strict types and zero errors.
- [x] **README**: Comprehensive instructions, design breakdown, setup tutorial, and test guidelines.
- [x] **API Documentation**: Detailed endpoint documentation in [API_DOCUMENTATION.md](file:///c:/Users/rayin/OneDrive/Desktop/Confluencer/API_DOCUMENTATION.md) plus interactive Swagger UI at `/api-docs`.
- [x] **Assumptions**: Fully detailed in [ASSUMPTIONS.md](file:///c:/Users/rayin/OneDrive/Desktop/Confluencer/ASSUMPTIONS.md).
- [x] **Bonus Money Transfer**: Implemented with atomic rollback and dual-ledger tracking.
- [x] **Web Dashboard**: Interactive, responsive visual client included.
- [x] **Automated Tests**: 23/23 tests passing.
