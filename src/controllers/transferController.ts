import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../services/transferService.js';
import { getDatabase } from '../db/database.js';

export class TransferController {
  private static getService(): TransferService {
    return new TransferService(getDatabase());
  }

  public static transferMoney(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = TransferController.getService();
      const result = service.transferMoney(req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static getTransfers(_req: Request, res: Response, next: NextFunction): void {
    try {
      const service = TransferController.getService();
      const transfers = service.getAllTransfers();

      res.status(200).json({
        success: true,
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }
}
