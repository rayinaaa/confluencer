import { Router } from 'express';
import { AccountController } from '../controllers/accountController.js';
import { TransactionController } from '../controllers/transactionController.js';
import {
  validateBody,
  validateParams,
  validateQuery,
  createAccountSchema,
  createTransactionSchema,
  getTransactionsQuerySchema,
  accountIdParamSchema,
} from '../middlewares/validate.js';

const router = Router();

// Account endpoints
router.post(
  '/',
  validateBody(createAccountSchema),
  AccountController.createAccount
);

router.get('/', AccountController.getAllAccounts);

router.get(
  '/:id',
  validateParams(accountIdParamSchema),
  AccountController.getAccount
);

router.get(
  '/:id/balance',
  validateParams(accountIdParamSchema),
  AccountController.getAccountBalance
);

router.get(
  '/:id/integrity',
  validateParams(accountIdParamSchema),
  AccountController.verifyIntegrity
);

// Transaction endpoints nested under account
router.post(
  '/:id/transactions',
  validateParams(accountIdParamSchema),
  validateBody(createTransactionSchema),
  TransactionController.addTransaction
);

router.get(
  '/:id/transactions',
  validateParams(accountIdParamSchema),
  validateQuery(getTransactionsQuerySchema),
  TransactionController.getTransactions
);

// Immutability enforcement (PUT, PATCH, DELETE are strictly disallowed)
router.put('/:id/transactions', TransactionController.disallowModification);
router.put('/:id/transactions/:txId', TransactionController.disallowModification);
router.patch('/:id/transactions', TransactionController.disallowModification);
router.patch('/:id/transactions/:txId', TransactionController.disallowModification);
router.delete('/:id/transactions', TransactionController.disallowModification);
router.delete('/:id/transactions/:txId', TransactionController.disallowModification);

export default router;
