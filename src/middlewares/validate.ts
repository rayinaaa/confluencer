import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Invalid request body data', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Invalid query parameters', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Invalid URL parameters', details));
      } else {
        next(error);
      }
    }
  };
}

// Schemas
export const createAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Account name is required and cannot be empty')
      .max(100, 'Account name cannot exceed 100 characters'),
    balance: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.balance !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['balance'],
        message: 'Client is not allowed to set initial balance. Initial balance must always be 0.',
      });
    }
  });

export const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit'] as const),
  amount: z
    .number()
    .positive('Transaction amount must be greater than 0')
    .finite('Transaction amount must be a finite number')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Transaction amount cannot have more than 2 decimal places',
    }),
  reference_id: z
    .string()
    .trim()
    .min(1, 'reference_id is required and cannot be empty'),
  description: z
    .string()
    .trim()
    .max(255, 'description cannot exceed 255 characters')
    .optional(),
});

export const getTransactionsQuerySchema = z.object({
  type: z.enum(['credit', 'debit'] as const).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page parameter must be a positive integer >= 1',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Limit parameter must be an integer between 1 and 100',
    }),
});

export const accountIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Account ID is required'),
});

export const createTransferSchema = z
  .object({
    source_account_id: z
      .string()
      .trim()
      .min(1, 'source_account_id is required and cannot be empty'),
    destination_account_id: z
      .string()
      .trim()
      .min(1, 'destination_account_id is required and cannot be empty'),
    amount: z
      .number()
      .positive('Transfer amount must be greater than 0')
      .finite('Transfer amount must be a finite number')
      .refine((val) => Number(val.toFixed(2)) === val, {
        message: 'Transfer amount cannot have more than 2 decimal places',
      }),
    reference_id: z
      .string()
      .trim()
      .min(1, 'reference_id is required and cannot be empty'),
    description: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: 'Source and destination accounts must be different',
    path: ['destination_account_id'],
  });
