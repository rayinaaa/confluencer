# Transaction Ledger API Documentation

Welcome to the **Transaction Ledger API** documentation. This service provides a double-entry, ACID-compliant ledger engine for account management, credit/debit operations, real-time balance tracking, immutable audit trails, and atomic fund transfers.

- **Base URL**: `http://localhost:3000/api/v1`
- **Interactive OpenAPI / Swagger UI**: `http://localhost:3000/api-docs`
- **Interactive Web Dashboard**: `http://localhost:3000/`

---

## Standard Response Format

All responses follow a predictable JSON schema:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error",
    "details": null
  }
}
```

### HTTP Status Code Conventions
| Status Code | Meaning | Usage |
|:---|:---|:---|
| `200 OK` | Success | Retrieved balance, accounts, or history |
| `201 Created` | Created | Account, transaction, or transfer created |
| `400 Bad Request` | Validation Error | Missing fields, negative amounts, invalid types |
| `404 Not Found` | Resource Not Found | Account ID does not exist |
| `405 Method Not Allowed` | Method Prohibited | Attempting to `PUT`, `PATCH`, or `DELETE` transactions (immutability) |
| `409 Conflict` | Duplicate Entry | Duplicate `reference_id` submitted for the same account |
| `422 Unprocessable` | Business Rule Violation | Debit transaction exceeds available balance (insufficient funds) |
| `500 Server Error` | Internal Server Error | Unhandled runtime failure |

---

## 1. Accounts API

### 1.1 Create Account
Creates a new account in the system.

- **Method**: `POST`
- **Endpoint**: `/accounts`
- **Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Account holder name (1 to 100 characters). |

> **Note**: The client **cannot** specify an initial balance. Accounts always initialize with a balance of `0.00`. Supplying a `balance` field returns an HTTP `400 Bad Request`.

#### Request Example
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Walker"}'
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "name": "Alice Walker",
    "balance": 0,
    "created_at": "2026-10-27T10:15:30.120Z"
  }
}
```

---

### 1.2 Get Account Details
Fetch details for an existing account.

- **Method**: `GET`
- **Endpoint**: `/accounts/:id`

#### Request Example
```bash
curl http://localhost:3000/api/v1/accounts/e4b60099-07d7-4630-b384-cb9192f6df41
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "name": "Alice Walker",
    "balance": 150.0,
    "created_at": "2026-10-27T10:15:30.120Z"
  }
}
```

---

### 1.3 Get Account Balance
Retrieves the current verified balance for an account.

- **Method**: `GET`
- **Endpoint**: `/accounts/:id/balance`

#### Request Example
```bash
curl http://localhost:3000/api/v1/accounts/e4b60099-07d7-4630-b384-cb9192f6df41/balance
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "account_id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "balance": 150.0
  }
}
```

#### Error Example: Account Not Found (`404 Not Found`)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account with id 'non-existent-id' not found",
    "details": null
  }
}
```

---

### 1.4 Verify Account Mathematical Integrity
Audit endpoint that compares stored balance against the ledger sum: `SUM(credits) - SUM(debits)`.

- **Method**: `GET`
- **Endpoint**: `/accounts/:id/integrity`

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "account_id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "stored_balance": 150.0,
    "calculated_balance": 150.0,
    "is_consistent": true
  }
}
```

---

## 2. Transactions API

### 2.1 Add Transaction
Adds a credit or debit transaction to an account and updates the account balance atomically.

- **Method**: `POST`
- **Endpoint**: `/accounts/:id/transactions`
  *(Alternative alias: `POST /transactions` with `account_id` in request body)*
- **Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `type` | string | Yes | Either `"credit"` or `"debit"`. |
| `amount` | number | Yes | Positive number > 0 (max 2 decimal places). |
| `reference_id` | string | Yes | Unique reference identifier within the account. |
| `description` | string | No | Optional human-readable memo (max 255 chars). |

#### Credit Example
```bash
curl -X POST http://localhost:3000/api/v1/accounts/e4b60099-07d7-4630-b384-cb9192f6df41/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "credit",
    "amount": 100.00,
    "reference_id": "DEP-2026-001",
    "description": "Initial account funding"
  }'
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "7876a4aa-1736-41fb-9457-2ad06e12e873",
    "account_id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "type": "credit",
    "amount": 100,
    "description": "Initial account funding",
    "reference_id": "DEP-2026-001",
    "created_at": "2026-10-27T10:16:45.310Z",
    "current_balance": 100
  }
}
```

---

#### Debit Example (Sufficient Funds)
```bash
curl -X POST http://localhost:3000/api/v1/accounts/e4b60099-07d7-4630-b384-cb9192f6df41/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "debit",
    "amount": 30.00,
    "reference_id": "DEB-2026-001",
    "description": "Coffee purchase"
  }'
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "e5519808-16ef-4663-875f-33d3ab2c40c8",
    "account_id": "e4b60099-07d7-4630-b384-cb9192f6df41",
    "type": "debit",
    "amount": 30,
    "description": "Coffee purchase",
    "reference_id": "DEB-2026-001",
    "created_at": "2026-10-27T10:17:15.820Z",
    "current_balance": 70
  }
}
```

---

#### Error: Insufficient Balance (`422 Unprocessable Entity`)
If current balance is `70.00` and a debit of `150.00` is requested:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Transaction rejected: Insufficient balance. Current balance is 70.00, requested debit is 150.00",
    "details": {
      "current_balance": 70,
      "attempted_debit": 150
    }
  }
}
```

---

#### Error: Duplicate Transaction Reference (`409 Conflict`)
If the same `reference_id` is re-submitted for the same account:
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION_REFERENCE",
    "message": "Transaction with reference_id 'DEP-2026-001' already exists for this account",
    "details": {
      "existing_transaction_id": "7876a4aa-1736-41fb-9457-2ad06e12e873",
      "reference_id": "DEP-2026-001"
    }
  }
}
```

---

### 2.2 Get Transaction History
Retrieves paginated transactions for an account sorted in latest-first order.

- **Method**: `GET`
- **Endpoint**: `/accounts/:id/transactions`
- **Query Parameters**:
  - `page`: Page number (integer >= 1, default `1`).
  - `limit`: Records per page (integer 1-100, default `10`).
  - `type`: Optional filter: `"credit"` or `"debit"`. (Omit to retrieve both).

#### Request Example
```bash
curl "http://localhost:3000/api/v1/accounts/e4b60099-07d7-4630-b384-cb9192f6df41/transactions?page=1&limit=5&type=credit"
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "7876a4aa-1736-41fb-9457-2ad06e12e873",
        "account_id": "e4b60099-07d7-4630-b384-cb9192f6df41",
        "type": "credit",
        "amount": 100,
        "description": "Initial account funding",
        "reference_id": "DEP-2026-001",
        "created_at": "2026-10-27T10:16:45.310Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "page_size": 5,
      "total_records": 1,
      "total_pages": 1
    }
  }
}
```

---

### 2.3 Transaction Immutability Prohibitions
To preserve accounting and ledger integrity, transactions cannot be altered or removed.

Calling `PUT`, `PATCH`, or `DELETE` on `/accounts/:id/transactions` or `/transactions/:id` immediately returns:

#### Response Example (`405 Method Not Allowed`)
```json
{
  "success": false,
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Transactions are strictly immutable in this ledger. Modifications or deletions are prohibited.",
    "details": null
  }
}
```

---

## 3. Money Transfer API (Bonus Feature)

### 3.1 Execute Inter-Account Money Transfer
Executes an atomic transfer of funds from a source account to a destination account.
- Both accounts must exist.
- Source account must have sufficient balance.
- Transfers are executed inside a single ACID SQLite transaction.
- If either account operation fails, neither balance changes.

- **Method**: `POST`
- **Endpoint**: `/transfers`
- **Headers**: `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `source_account_id` | string | Yes | ID of the account being debited. |
| `destination_account_id` | string | Yes | ID of the account being credited (must be different from source). |
| `amount` | number | Yes | Positive amount > 0 (max 2 decimal places). |
| `reference_id` | string | Yes | Unique reference identifier for the transfer. |
| `description` | string | No | Optional transfer description. |

#### Request Example
```bash
curl -X POST http://localhost:3000/api/v1/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "source_account_id": "1b081eaa-f052-442b-bdb8-e4139ae327df",
    "destination_account_id": "0ee33c21-db17-472e-8b76-467c9f4152b8",
    "amount": 30.00,
    "reference_id": "TRF-2026-0099",
    "description": "Invoice payment"
  }'
```

#### Response Example (`201 Created`)
```json
{
  "success": true,
  "data": {
    "transfer": {
      "id": "8ef04da4-16a2-4a0b-8012-70b92eb18f27",
      "source_account_id": "1b081eaa-f052-442b-bdb8-e4139ae327df",
      "destination_account_id": "0ee33c21-db17-472e-8b76-467c9f4152b8",
      "amount": 30,
      "reference_id": "TRF-2026-0099",
      "description": "Invoice payment",
      "created_at": "2026-10-27T10:19:30.401Z"
    },
    "source_account": {
      "id": "1b081eaa-f052-442b-bdb8-e4139ae327df",
      "new_balance": 70
    },
    "destination_account": {
      "id": "0ee33c21-db17-472e-8b76-467c9f4152b8",
      "new_balance": 80
    }
  }
}
```

---

## 4. System Health Check

- **Method**: `GET`
- **Endpoint**: `/health`

```json
{
  "status": "healthy",
  "timestamp": "2026-10-27T10:20:00.000Z",
  "service": "transaction-ledger-api",
  "version": "1.0.0"
}
```
