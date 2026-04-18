import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { legalIntelService } from '../services/legal-intel.service';
import { requireLawyerOrAbove } from '../middleware/roles';

const legalIntelRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, { limits: { fileSize: 32 * 1024 * 1024 } });

  const auth = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

  /** Reenvía un archivo al servicio Legal Intel (LEGAL_INTEL_URL) — mismo contrato que /legal/upload */
  fastify.post('/legal-intel/upload', auth, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'Archivo requerido (campo "file")' });
    }
    const buffer = await file.toBuffer();
    const formData = new FormData();
    const u8 = new Uint8Array(buffer);
    formData.append('file', new Blob([u8], { type: file.mimetype || 'application/octet-stream' }), file.filename);
    try {
      const result = await legalIntelService.uploadDocument(formData);
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return reply.code(502).send({ error: msg });
    }
  });

  // POST /legal-intel/generate
  fastify.post('/legal-intel/generate', auth, async (request) => {
    const body = z.object({
      type: z.enum(['dictamen', 'contrato', 'memo', 'escrito']),
      title: z.string().min(3),
      instructions: z.string().min(10),
      knowledgeBases: z.array(z.string()).optional(),
    }).parse(request.body);
    return legalIntelService.generateDocument(body);
  });

  // POST /legal-intel/query
  fastify.post('/legal-intel/query', auth, async (request) => {
    const { documentId, query } = z.object({
      documentId: z.string(),
      query: z.string().min(5),
    }).parse(request.body);
    return legalIntelService.queryDocument(documentId, query);
  });

  // GET /legal-intel/status/:liDocumentId
  fastify.get('/legal-intel/status/:liDocumentId', auth, async (request) => {
    const { liDocumentId } = request.params as { liDocumentId: string };
    return legalIntelService.getAnalysisStatus(liDocumentId);
  });

  // GET /legal-intel/result/:liDocumentId
  fastify.get('/legal-intel/result/:liDocumentId', auth, async (request) => {
    const { liDocumentId } = request.params as { liDocumentId: string };
    return legalIntelService.getAnalysisResult(liDocumentId);
  });

  // POST /legal-intel/compare
  fastify.post('/legal-intel/compare', auth, async (request) => {
    return legalIntelService.compareDocuments(request.body as object);
  });

  // GET /legal-intel/compare/:comparisonId
  fastify.get('/legal-intel/compare/:comparisonId', auth, async (request) => {
    const { comparisonId } = request.params as { comparisonId: string };
    return legalIntelService.getComparisonResult(comparisonId);
  });
};

export default legalIntelRoutes;
