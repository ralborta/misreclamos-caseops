import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { recordEvent } from '../services/timeline.service';
import { legalIntelService } from '../services/legal-intel.service';
import { requireLawyerOrAbove } from '../middleware/roles';
import { regenerateCaseSummary } from '../services/case-summary.service';

const docSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.string().optional(),
  stage: z.string().optional(),
});

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

  fastify.get('/cases/:caseId/documents', auth, async (request) => {
    const { caseId } = request.params as { caseId: string };
    return prisma.document.findMany({
      where: { caseId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Register document metadata (without file upload — file goes to LI)
  fastify.post('/cases/:caseId/documents', auth, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = docSchema.parse(request.body);

    const doc = await prisma.document.create({
      data: { ...body, caseId, uploadedById: request.user.id },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await recordEvent({ caseId, userId: request.user.id, action: `Documento cargado: "${doc.name}"`, type: 'documento' });
    await regenerateCaseSummary({ caseId, userId: request.user.id, reason: 'document_created' });

    reply.code(201);
    return doc;
  });

  // Link document to Legal Intelligence analysis
  fastify.post('/cases/:caseId/documents/:id/analyze', auth, async (request, reply) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    const { instructions, legalIntelDocumentId } = z.object({
      instructions: z.string().optional(),
      legalIntelDocumentId: z.string(),
    }).parse(request.body);

    const result = await legalIntelService.analyzeDocument(legalIntelDocumentId, instructions);

    await prisma.document.update({
      where: { id, caseId },
      data: { linkedLegalIntel: true, legalIntelDocumentId },
    });

    await recordEvent({ caseId, userId: request.user.id, action: `Documento enviado a Legal Intelligence para análisis`, type: 'legal_intel' });

    return result;
  });

  fastify.delete('/cases/:caseId/documents/:id', auth, async (request) => {
    const { caseId, id } = request.params as { caseId: string; id: string };
    await prisma.document.delete({ where: { id, caseId } });
    await regenerateCaseSummary({ caseId, userId: request.user.id, reason: 'document_deleted' });
    return { ok: true };
  });
};

export default documentRoutes;
