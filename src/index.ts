import { config } from './config/index';
import { createApp } from './app';
import { logger } from './utils/logger';

import { PrismaClient } from '../generated/prisma/client';
import { initializeRepository } from './repositories/analysis.repository';

export const prisma = new PrismaClient({
  accelerateUrl: process.env['DATABASE_URL']!,
});

async function main(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Connected to PostgreSQL');

  initializeRepository(prisma);

  const app = createApp();

  app.listen(config.PORT, () => {
    logger.info(`🚀 StockAI API running on port ${config.PORT}`, {
      env: config.NODE_ENV,
      port: config.PORT,
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

main().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
