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
import intakeRoutes from './routes/intake';
import agendaRoutes from './routes/agenda';
import { startAlertsWorker } from './workers/alerts.worker';
import { prisma } from './utils/prisma';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: config.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  },
});

async function runSeedIfNeeded() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      const bcrypt = await import('bcryptjs');
      const adminHash = await bcrypt.hash('Admin123!', 12);
      const admin = await prisma.user.create({ data: { email: 'admin@misreclamos.com', passwordHash: adminHash, name: 'Admin Sistema', role: 'admin' } });
      const coordHash = await bcrypt.hash('Coord123!', 12);
      const coord = await prisma.user.create({ data: { email: 'cmendez@misreclamos.com', passwordHash: coordHash, name: 'Lic. Carolina Méndez', role: 'coordinador' } });
      const abogadoHash = await bcrypt.hash('Abogado123!', 12);
      const rios = await prisma.user.create({ data: { email: 'mrios@misreclamos.com', passwordHash: abogadoHash, name: 'Dr. Martín Ríos', role: 'abogado_interno' } });
      await prisma.user.create({ data: { email: 'vsousa@misreclamos.com', passwordHash: abogadoHash, name: 'Dra. Valeria Sousa', role: 'abogado_interno' } });
      await prisma.user.create({ data: { email: 'spereyra@misreclamos.com', passwordHash: abogadoHash, name: 'Dr. Santiago Pereyra', role: 'abogado_asociado' } });
      const client = await prisma.client.create({ data: { name: 'Roberto García', dni: '28.451.892', phone: '+54 11 4521-8870', email: 'rgarcia@gmail.com', city: 'CABA', province: 'Buenos Aires', consent: true } });
      const caso = await prisma.case.create({ data: { caseId: 'MR-2024-00341', title: 'Despido sin causa — García vs. Logística Norte S.A.', materia: 'laboral', subtype: 'Despido incausado', status: 'en_gestion', stage: 'Intercambio telegráfico', priority: 'alta', channel: 'web', isUrgent: true, clientId: client.id, assignedLawyerId: rios.id, coordinatorId: coord.id } });
      await prisma.timelineEvent.create({ data: { caseId: caso.id, userId: admin.id, action: 'Expediente creado desde seed inicial', type: 'creacion' } });
      console.log('✅ Seed inicial completado — admin@misreclamos.com / Admin123!');
    }
  } catch (e) {
    console.error('Seed error (non-fatal):', e);
  }
}

async function bootstrap() {
  await runSeedIfNeeded();

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
  await fastify.register(agendaRoutes);
  await fastify.register(userRoutes);
  await fastify.register(legalIntelRoutes);
  await fastify.register(intakeRoutes);

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
