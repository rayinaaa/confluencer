import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Check if it's our structured AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  // Handle SQLite constraint errors if they bubble up
  const errString = err.toString();
  if (errString.includes('UNIQUE constraint failed')) {
    if (errString.includes('transactions.account_id') && errString.includes('transactions.reference_id')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_TRANSACTION_REFERENCE',
          message: 'A transaction with this reference_id already exists for this account',
          details: null,
        },
      });
      return;
    }

    if (errString.includes('transfers.reference_id')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_TRANSFER_REFERENCE',
          message: 'A transfer with this reference_id already exists',
          details: null,
        },
      });
      return;
    }
  }

  if (errString.includes('CHECK constraint failed: balance >= 0')) {
    res.status(422).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Transaction rejected: Insufficient account balance',
        details: null,
      },
    });
    return;
  }

  if (errString.includes('FOREIGN KEY constraint failed')) {
    res.status(404).json({
      success: false,
      error: {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'The referenced account does not exist',
        details: null,
      },
    });
    return;
  }

  // Handle JSON parse errors from express.json()
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON_BODY',
        message: 'Malformed JSON payload provided in request body',
        details: null,
      },
    });
    return;
  }

  // Unhandled / Internal Server Errors
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      details: null,
    },
  });
}
