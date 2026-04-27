import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { recordEvent } from '../services/timeline.service';
import { requireLawyerOrAbove } from '../middleware/roles';
import { regenerateCaseSummary } from '../services/case-summary.service';

const noteSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['interna', 'estrategica', 'cliente', 'alerta']).default('interna'),
  visibility: z.enum(['todos', 'equipo', 'coordinadores']).default('equipo'),
});

const noteRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

  fastify.get('/cases/:caseId/notes', auth, async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.note.findMany({
      where: { caseId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  fastify.post('/cases/:caseId/notes', auth, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = noteSchema.parse(request.body);

    const note = await prisma.note.create({
      data: { ...body, caseId, authorId: request.user.id },
      include: { author: { select: { id: true, name: true } } },
    });

    await recordEvent({ caseId, userId: request.user.id, action: `Nota ${body.type} agregada`, type: 'nota' });
    await regenerateCaseSummary({ caseId, userId: request.user.id, reason: 'note_created' });

    reply.code(201);
    return note;
  });

  fastify.patch('/cases/:caseId/notes/:id', auth, async (request) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    const body = z.object({ content: z.string().min(1) }).parse(request.body);
    const updated = await prisma.note.update({ where: { id, caseId }, data: body });
    await regenerateCaseSummary({ caseId, userId: request.user.id, reason: 'note_updated' });
    return updated;
  });

  fastify.delete('/cases/:caseId/notes/:id', auth, async (request) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    await prisma.note.delete({ where: { id, caseId } });
    await regenerateCaseSummary({ caseId, userId: request.user.id, reason: 'note_deleted' });
    return { ok: true };
  });
};

export default noteRoutes;
