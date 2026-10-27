export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND', details?: unknown) {
    super(message, 404, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code: string = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = 'Insufficient balance for this transaction', details?: unknown) {
    super(message, 422, 'INSUFFICIENT_FUNDS', details);
  }
}

export class DuplicateTransactionError extends ConflictError {
  constructor(
    message: string = 'A transaction with this reference_id already exists for this account',
    details?: unknown
  ) {
    super(message, 'DUPLICATE_TRANSACTION_REFERENCE', details);
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message: string = 'Method not allowed. Ledger transactions are strictly immutable.') {
    super(message, 405, 'METHOD_NOT_ALLOWED');
  }
}
