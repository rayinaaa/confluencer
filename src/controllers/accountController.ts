import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/accountService.js';
import { getDatabase } from '../db/database.js';

export class AccountController {
  private static getService(): AccountService {
    return new AccountService(getDatabase());
  }

  public static createAccount(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = AccountController.getService();
      const account = service.createAccount(req.body);
      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  public static getAccount(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = AccountController.getService();
      const account = service.getAccountById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  }

  public static getAccountBalance(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = AccountController.getService();
      const balanceData = service.getAccountBalance(req.params.id as string);
      res.status(200).json({
        success: true,
        data: balanceData,
      });
    } catch (error) {
      next(error);
    }
  }

  public static getAllAccounts(_req: Request, res: Response, next: NextFunction): void {
    try {
      const service = AccountController.getService();
      const accounts = service.getAllAccounts();
      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  public static verifyIntegrity(req: Request, res: Response, next: NextFunction): void {
    try {
      const service = AccountController.getService();
      const report = service.verifyAccountIntegrity(req.params.id as string);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
