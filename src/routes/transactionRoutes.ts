import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransactionController } from '../controllers/transactionController.js';
import { validateBody } from '../middlewares/validate.js';
import { TransactionService } from '../services/transactionService.js';
import { getDatabase } from '../db/database.js';

const router = Router();

const directTransactionSchema = z.object({
  account_id: z
    .string()
    .trim()
    .min(1, 'account_id is required and cannot be empty'),
  type: z.enum(['credit', 'debit'] as const),
  amount: z
    .number()
    .positive('amount must be greater than 0')
    .finite('amount must be a finite number')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'amount cannot have more than 2 decimal places',
    }),
  reference_id: z
    .string()
    .trim()
    .min(1, 'reference_id is required and cannot be empty'),
  description: z.string().trim().max(255).optional(),
});

// Direct transaction endpoint supporting account_id in body
router.post(
  '/',
  validateBody(directTransactionSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const service = new TransactionService(getDatabase());
      const { account_id, ...txData } = req.body;
      const result = service.addTransaction(account_id, txData);
      res.status(201).json({
        success: true,
        data: {
          ...result.transaction,
          current_balance: result.account_balance,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Immutability enforcement (PUT, PATCH, DELETE are strictly disallowed on transactions)
router.put('/', TransactionController.disallowModification);
router.put('/:id', TransactionController.disallowModification);
router.patch('/', TransactionController.disallowModification);
router.patch('/:id', TransactionController.disallowModification);
router.delete('/', TransactionController.disallowModification);
router.delete('/:id', TransactionController.disallowModification);

export default router;
