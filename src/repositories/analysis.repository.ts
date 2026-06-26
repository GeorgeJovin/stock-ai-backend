import { PrismaClient } from '../../generated/prisma/client';
import type { AnalysisResult } from '../types/index';
import { logger } from '../utils/logger';

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      accelerateUrl: process.env['DATABASE_URL']!,
    });
  }
  return _prisma;
}

export function initializeRepository(prismaClient: PrismaClient): void {
  _prisma = prismaClient;
}

export const analysisRepository = {
  async findValidByTicker(ticker: string, maxAgeHours: number) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const prisma = getPrisma();

    const analysis = await prisma.analysis.findUnique({
      where: { ticker },
    });

    if (analysis && analysis.updatedAt > cutoff) {
      return analysis;
    }

    return null;
  },

  async upsert(ticker: string, data: AnalysisResult) {
    const prisma = getPrisma();

    const analysis = await prisma.analysis.upsert({
      where: { ticker },
      create: {
        ticker,
        bullCase: data.bullCase,
        bearCase: data.bearCase,
        verdict: data.verdict,
      },
      update: {
        bullCase: data.bullCase,
        bearCase: data.bearCase,
        verdict: data.verdict,
      },
    });

    logger.info('Analysis saved to cache', { ticker, id: analysis.id });
    return analysis;
  },

  async findByTicker(ticker: string) {
    const prisma = getPrisma();
    return prisma.analysis.findUnique({
      where: { ticker },
    });
  },
};
