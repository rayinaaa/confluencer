import { Router } from 'express';
import { TransferController } from '../controllers/transferController.js';
import { validateBody, createTransferSchema } from '../middlewares/validate.js';

const router = Router();

router.post('/', validateBody(createTransferSchema), TransferController.transferMoney);
router.get('/', TransferController.getTransfers);

export default router;
