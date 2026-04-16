import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { legalIntelService } from '../services/legal-intel.service';
import { requireLawyerOrAbove } from '../middleware/roles';

const legalIntelRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

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
