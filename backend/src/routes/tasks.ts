import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { recordEvent } from '../services/timeline.service';
import { requireLawyerOrAbove } from '../middleware/roles';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(['urgente', 'alta', 'media', 'baja']).default('media'),
  assignedToId: z.string().uuid().optional(),
  stage: z.string().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['urgente', 'alta', 'media', 'baja']).optional(),
  status: z.enum(['pendiente', 'en_curso', 'completada', 'vencida']).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

  // GET /cases/:caseId/tasks
  fastify.get('/cases/:caseId/tasks', auth, async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.task.findMany({
      where: { caseId },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });
  });

  // POST /cases/:caseId/tasks
  fastify.post('/cases/:caseId/tasks', auth, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = taskSchema.parse(request.body);

    const task = await prisma.task.create({
      data: { ...body, dueDate: new Date(body.dueDate), caseId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await recordEvent({ caseId, userId: request.user.id, action: `Tarea creada: "${task.title}"`, type: 'tarea' });

    reply.code(201);
    return task;
  });

  // PATCH /cases/:caseId/tasks/:id
  fastify.patch('/cases/:caseId/tasks/:id', auth, async (request) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    const body = taskUpdateSchema.parse(request.body);

    const task = await prisma.task.update({
      where: { id, caseId },
      data: { ...body, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    if (body.status === 'completada') {
      await recordEvent({ caseId, userId: request.user.id, action: `Tarea completada: "${task.title}"`, type: 'tarea' });
    }

    return task;
  });

  // DELETE /cases/:caseId/tasks/:id
  fastify.delete('/cases/:caseId/tasks/:id', auth, async (request) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    await prisma.task.delete({ where: { id, caseId } });
    return { ok: true };
  });
};

export default taskRoutes;
