import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index';
import { generalLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { createApiRouter } from './routes/index';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

export function createApp(): express.Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      methods: ['GET'],
      allowedHeaders: ['Content-Type', 'Accept'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(generalLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use('/api', createApiRouter());

  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: 'Route not found',
    });
  });

  app.use(errorHandler);

  return app;
}
