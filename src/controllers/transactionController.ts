import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService.js';
import { getDatabase } from '../db/database.js';
import { MethodNotAllowedError } from '../errors/AppError.js';
import { PaginationParams } from '../types/index.js';

export class TransactionController {
  private static getService(): TransactionService {
    return new TransactionService(getDatabase());
  }

  public static addTransaction(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = TransactionController.getService();
      const accountId = req.params.id as string;
      const result = service.addTransaction(accountId, req.body);

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

  public static getTransactions(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = TransactionController.getService();
      const accountId = req.params.id as string;

      // Extract validated pagination and filter options
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const type = req.query.type as 'credit' | 'debit' | undefined;

      const paginationParams: PaginationParams = {
        page,
        limit,
        type,
      };

      const result = service.getTransactionHistory(accountId, paginationParams);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static disallowModification(_req: Request, _res: Response, next: NextFunction): void {
    next(new MethodNotAllowedError('Transactions are strictly immutable in this ledger. Modifications or deletions are prohibited.'));
  }
}
