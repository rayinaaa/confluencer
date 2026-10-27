import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'ledger.db'),
  isTest: process.env.NODE_ENV === 'test',
};
