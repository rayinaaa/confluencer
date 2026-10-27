export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Transaction Ledger API',
    version: '1.0.0',
    description: `
### Transaction Ledger & Accounting API
Production-grade Transaction Ledger system developed for the Full Stack Developer Assessment.
Enforces double-entry principles, ACID atomicity, strict balance consistency, idempotent transactions, and immutability.

#### Key Guarantees:
- **Atomicity**: Transactions and balance updates execute in a single isolated SQLite transaction.
- **Strict Immutability**: Ledger transactions cannot be updated or deleted (\`PUT\`, \`PATCH\`, \`DELETE\` are rejected with 405).
- **Duplicate Prevention**: Composite uniqueness on \`(account_id, reference_id)\` prevents duplicate submissions.
- **Overdraft Protection**: Debit transactions that exceed available balance are rejected with HTTP 422.
- **Bonus Money Transfer**: Atomic fund transfers between accounts with automatic dual-ledger entry.
    `,
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Root',
    },
  ],
  paths: {
    '/accounts': {
      post: {
        summary: 'Create a new account',
        description: 'Creates a new ledger account. Initial balance is always 0.0 and cannot be set by client.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    example: 'Alice Walker',
                    description: 'Account holder full name',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account successfully created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AccountResponse',
                },
              },
            },
          },
          400: {
            description: 'Validation Error (e.g. missing name, or client attempting to set initial balance)',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      get: {
        summary: 'List all accounts',
        description: 'Returns all registered accounts in the system with their current balances.',
        responses: {
          200: {
            description: 'List of accounts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Account' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/accounts/{id}': {
      get: {
        summary: 'Get account details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique account identifier',
          },
        ],
        responses: {
          200: {
            description: 'Account details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/accounts/{id}/balance': {
      get: {
        summary: 'Get current account balance',
        description: 'Retrieves the verified current balance for an account.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Account identifier',
          },
        ],
        responses: {
          200: {
            description: 'Current account balance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        account_id: { type: 'string', example: 'd3b07384-d113-4015-8445-6679df3a4ff6' },
                        balance: { type: 'number', example: 150.0 },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/accounts/{id}/transactions': {
      post: {
        summary: 'Add a transaction to an account',
        description: 'Adds a credit or debit transaction to the specified account. Executed atomically with balance update.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Account identifier',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateTransactionRequest',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Transaction successfully executed and persisted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TransactionWithBalance' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error (invalid amount, type, or missing reference_id)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Duplicate reference_id for this account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          422: {
            description: 'Insufficient balance for debit transaction',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        summary: 'Get transaction history for an account',
        description: 'Retrieves paginated transactions for an account sorted in latest-first order by created_at.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Account identifier',
          },
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['credit', 'debit'] },
            description: 'Filter transactions by type (credit or debit)',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Page number for pagination',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
            description: 'Records per page',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of transactions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedTransactionsResponse',
                },
              },
            },
          },
          400: {
            description: 'Invalid pagination query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Account not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/transfers': {
      post: {
        summary: 'Transfer money between accounts (Bonus Feature)',
        description: 'Performs an atomic money transfer: debits source account and credits destination account inside a single ACID transaction.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['source_account_id', 'destination_account_id', 'amount', 'reference_id'],
                properties: {
                  source_account_id: { type: 'string' },
                  destination_account_id: { type: 'string' },
                  amount: { type: 'number', minimum: 0.01, example: 50.0 },
                  reference_id: { type: 'string', example: 'trf-2026-001' },
                  description: { type: 'string', example: 'Vendor invoice payment' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Transfer successfully completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        transfer: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            source_account_id: { type: 'string' },
                            destination_account_id: { type: 'string' },
                            amount: { type: 'number' },
                            reference_id: { type: 'string' },
                            created_at: { type: 'string' },
                          },
                        },
                        source_account: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            new_balance: { type: 'number' },
                          },
                        },
                        destination_account: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            new_balance: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error (e.g. self-transfer or negative amount)',
          },
          404: {
            description: 'Source or destination account not found',
          },
          409: {
            description: 'Duplicate transfer reference_id',
          },
          422: {
            description: 'Insufficient funds in source account',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Account: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9a88523c-f4ab-42a1-a472-8889a74421aa' },
          name: { type: 'string', example: 'Alice Walker' },
          balance: { type: 'number', example: 100.0 },
          created_at: { type: 'string', format: 'date-time', example: '2026-10-27T10:00:00.000Z' },
        },
      },
      AccountResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { $ref: '#/components/schemas/Account' },
        },
      },
      CreateTransactionRequest: {
        type: 'object',
        required: ['type', 'amount', 'reference_id'],
        properties: {
          type: { type: 'string', enum: ['credit', 'debit'], example: 'credit' },
          amount: { type: 'number', minimum: 0.01, example: 50.0 },
          reference_id: { type: 'string', example: 'dep-1001' },
          description: { type: 'string', example: 'Initial funding' },
        },
      },
      TransactionWithBalance: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          account_id: { type: 'string' },
          type: { type: 'string', enum: ['credit', 'debit'] },
          amount: { type: 'number' },
          description: { type: 'string', nullable: true },
          reference_id: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          current_balance: { type: 'number', example: 150.0 },
        },
      },
      PaginatedTransactionsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              records: {
                type: 'array',
                items: { $ref: '#/components/schemas/TransactionWithBalance' },
              },
              pagination: {
                type: 'object',
                properties: {
                  current_page: { type: 'integer', example: 1 },
                  page_size: { type: 'integer', example: 10 },
                  total_records: { type: 'integer', example: 45 },
                  total_pages: { type: 'integer', example: 5 },
                },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INSUFFICIENT_FUNDS' },
              message: { type: 'string', example: 'Transaction rejected: Insufficient account balance' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  },
};
