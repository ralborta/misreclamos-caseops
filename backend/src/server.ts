import 'dotenv/config';
import Fastify from 'fastify';
import { config } from './config';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import swaggerPlugin from './plugins/swagger';
import authRoutes from './routes/auth';
import caseRoutes from './routes/cases';
import taskRoutes from './routes/tasks';
import noteRoutes from './routes/notes';
import documentRoutes from './routes/documents';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';
import legalIntelRoutes from './routes/legal-intel';
import { startAlertsWorker } from './workers/alerts.worker';
import { prisma } from './utils/prisma';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: config.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
});

async function bootstrap() {
  // Plugins
  await fastify.register(corsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(swaggerPlugin);

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'caseops-api',
    timestamp: new Date().toISOString(),
  }));

  // Dashboard stats endpoint
  fastify.get('/dashboard/stats', { preHandler: [fastify.authenticate] }, async () => {
    const [activeCases, urgentCases, dormantCases, unassigned, overdueTasks, closedThisMonth] = await Promise.all([
      prisma.case.count({ where: { status: { notIn: ['cerrado', 'archivado'] } } }),
      prisma.case.count({ where: { isUrgent: true, status: { notIn: ['cerrado', 'archivado'] } } }),
      prisma.case.count({ where: { isDormant: true } }),
      prisma.case.count({ where: { assignedLawyerId: null, status: { notIn: ['cerrado', 'archivado'] } } }),
      prisma.task.count({ where: { status: 'vencida' } }),
      prisma.case.count({
        where: {
          status: 'cerrado',
          updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);
    return { activeCases, urgentCases, dormantCases, unassigned, overdueTasks, closedThisMonth };
  });

  // Routes
  await fastify.register(authRoutes);
  await fastify.register(caseRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(noteRoutes);
  await fastify.register(documentRoutes);
  await fastify.register(alertRoutes);
  await fastify.register(userRoutes);
  await fastify.register(legalIntelRoutes);

  // Start alerts worker
  startAlertsWorker();

  // Start server
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`🚀 CaseOps API running on port ${config.PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${config.PORT}/docs`);
}

// Graceful shutdown
const shutdown = async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
