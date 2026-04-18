import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma';
import { requireCoordOrAbove } from '../middleware/roles';

const alertRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] };
  const authCoord = { preHandler: [fastify.authenticate, requireCoordOrAbove()] };

  // GET /alerts
  fastify.get('/alerts', auth, async (request) => {
    const query = request.query as Record<string, string>;
    const { type, resolved = 'false', page = '1', limit = '50' } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = {
      resolved: resolved === 'true',
      ...(type ? { type } : {}),
    };

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: { case: { select: { id: true, caseId: true, title: true, materia: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.alert.count({ where }),
    ]);

    return { alerts, total };
  });

  // PATCH /alerts/:id/resolve
  fastify.patch('/alerts/:id/resolve', authCoord, async (request, reply) => {
    const { id } = request.params as { id: string };
    const alert = await prisma.alert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return alert;
  });

  // GET /alerts/summary — para el dashboard
  fastify.get('/alerts/summary', auth, async () => {
    const [dormidos, tareasVencidas, tareasProximas, sinAsignar, vencimientosProximos] = await Promise.all([
      prisma.alert.count({ where: { type: 'dormido', resolved: false } }),
      prisma.alert.count({ where: { type: 'tarea_vencida', resolved: false } }),
      prisma.alert.count({ where: { type: 'tarea_proxima', resolved: false } }),
      prisma.alert.count({ where: { type: 'sin_asignar', resolved: false } }),
      prisma.alert.count({ where: { type: 'vencimiento_proximo', resolved: false } }),
    ]);
    return {
      dormidos,
      tareasVencidas,
      tareasProximas,
      sinAsignar,
      vencimientosProximos,
      total: dormidos + tareasVencidas + tareasProximas + sinAsignar + vencimientosProximos,
    };
  });
};

export default alertRoutes;
