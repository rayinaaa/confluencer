import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import transferRoutes from './transferRoutes.js';

const apiRouter = Router();

// Health check
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'transaction-ledger-api',
    version: '1.0.0',
  });
});

// Mount modules
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/transfers', transferRoutes);

export default apiRouter;
