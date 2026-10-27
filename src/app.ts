import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import apiRouter from './routes/index.js';
import { swaggerDocument } from './docs/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';
import { config } from './config/index.js';

export function createApp(): express.Application {
  const app = express();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Security Middleware with relaxed CSP for Swagger UI & embedded dashboard
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Middleware
  app.use(cors());

  // Logging Middleware (skip during tests)
  if (!config.isTest) {
    app.use(morgan('dev'));
  }

  // JSON and URL-encoded body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files for the Web Dashboard UI
  let publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    publicDir = path.resolve(process.cwd(), 'src', 'public');
  }
  app.use(express.static(publicDir));

  // Interactive Swagger UI documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Mount API v1 router
  app.use('/api/v1', apiRouter);

  // Serve index.html for root path
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Handle 404 for undefined routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
