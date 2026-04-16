import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateCaseId } from '../utils/case-id';
import { recordEvent } from '../services/timeline.service';
import { requireCoordOrAbove, requireLawyerOrAbove } from '../middleware/roles';

const caseCreateSchema = z.object({
  title: z.string().min(3),
  materia: z.enum(['laboral', 'salud', 'consumidor', 'sucesion', 'accidente', 'familia', 'previsional', 'civil']),
  subtype: z.string().min(1),
  priority: z.enum(['urgente', 'alta', 'media', 'baja']).default('media'),
  channel: z.string().default('web'),
  summary: z.string().optional(),
  isUrgent: z.boolean().default(false),
  // Client inline
  client: z.object({
    name: z.string().min(1),
    dni: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    consent: z.boolean().default(false),
  }),
});

const caseUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  status: z.enum(['nuevo','en_revision','asignado','en_gestion','esperando_documentacion','en_negociacion','judicializado','pausado','cerrado','archivado']).optional(),
  stage: z.string().optional(),
  priority: z.enum(['urgente','alta','media','baja']).optional(),
  summary: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().datetime().optional(),
  isUrgent: z.boolean().optional(),
  assignedLawyerId: z.string().uuid().nullable().optional(),
  coordinatorId: z.string().uuid().nullable().optional(),
});

const caseRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] };
  const authCoord = { preHandler: [fastify.authenticate, requireCoordOrAbove()] };
  const authLawyer = { preHandler: [fastify.authenticate, requireLawyerOrAbove()] };

  const caseInclude = {
    client: true,
    assignedLawyer: { select: { id: true, name: true, email: true, role: true } },
    coordinator: { select: { id: true, name: true, email: true } },
    tasks: { include: { assignedTo: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' as const } },
    documents: { include: { uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' as const } },
    notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' as const } },
    timeline: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' as const } },
    alerts: { where: { resolved: false }, orderBy: { createdAt: 'desc' as const } },
  };

  // GET /cases
  fastify.get('/cases', auth, async (request) => {
    const query = request.query as Record<string, string>;
    const { status, materia, priority, assignedLawyerId, isDormant, isUrgent, search, page = '1', limit = '20' } = query;

    const user = request.user;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Abogados asociados solo ven sus casos
    const lawyerFilter = (user.role === 'abogado_asociado')
      ? { assignedLawyerId: user.id }
      : assignedLawyerId ? { assignedLawyerId } : {};

    const where: Record<string, unknown> = {
      ...lawyerFilter,
      ...(status ? { status } : {}),
      ...(materia ? { materia } : {}),
      ...(priority ? { priority } : {}),
      ...(isDormant !== undefined ? { isDormant: isDormant === 'true' } : {}),
      ...(isUrgent !== undefined ? { isUrgent: isUrgent === 'true' } : {}),
      ...(search ? {
        OR: [
          { caseId: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          client: true,
          assignedLawyer: { select: { id: true, name: true } },
          coordinator: { select: { id: true, name: true } },
          _count: { select: { tasks: true, documents: true, alerts: true } },
        },
        orderBy: [{ isUrgent: 'desc' }, { lastActivity: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.case.count({ where }),
    ]);

    return { cases, total, page: parseInt(page), limit: parseInt(limit) };
  });

  // GET /cases/:id
  fastify.get('/cases/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const caso = await prisma.case.findUnique({ where: { id }, include: caseInclude });
    if (!caso) return reply.code(404).send({ error: 'Caso no encontrado' });

    // Abogado asociado solo ve sus casos
    if (request.user.role === 'abogado_asociado' && caso.assignedLawyerId !== request.user.id) {
      return reply.code(403).send({ error: 'Acceso denegado' });
    }
    return caso;
  });

  // POST /cases
  fastify.post('/cases', authCoord, async (request, reply) => {
    const body = caseCreateSchema.parse(request.body);
    const caseId = await generateCaseId();

    const client = await prisma.client.create({ data: body.client });

    const caso = await prisma.case.create({
      data: {
        caseId,
        title: body.title,
        materia: body.materia,
        subtype: body.subtype,
        priority: body.priority,
        channel: body.channel,
        summary: body.summary,
        isUrgent: body.isUrgent,
        clientId: client.id,
        coordinatorId: request.user.id,
      },
      include: caseInclude,
    });

    await recordEvent({
      caseId: caso.id,
      userId: request.user.id,
      action: `Expediente ${caseId} creado`,
      type: 'creacion',
    });

    reply.code(201);
    return caso;
  });

  // PATCH /cases/:id
  fastify.patch('/cases/:id', authLawyer, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = caseUpdateSchema.parse(request.body);

    const existing = await prisma.case.findUnique({ where: { id }, select: { id: true, status: true, assignedLawyerId: true, caseId: true } });
    if (!existing) return reply.code(404).send({ error: 'Caso no encontrado' });

    // Abogado asociado no puede cambiar estado/asignación
    if (request.user.role === 'abogado_asociado') {
      delete (body as Record<string, unknown>).assignedLawyerId;
      delete (body as Record<string, unknown>).status;
    }

    const updated = await prisma.case.update({
      where: { id },
      data: {
        ...body,
        nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : undefined,
      },
      include: caseInclude,
    });

    // Timeline automático
    if (body.status && body.status !== existing.status) {
      await recordEvent({ caseId: id, userId: request.user.id, action: `Estado actualizado: ${body.status}`, type: 'estado' });
    }
    if (body.assignedLawyerId !== undefined && body.assignedLawyerId !== existing.assignedLawyerId) {
      await recordEvent({ caseId: id, userId: request.user.id, action: `Abogado asignado`, type: 'asignacion' });
    }

    return updated;
  });

  // DELETE /cases/:id (admin only, soft = archive)
  fastify.delete('/cases/:id', { preHandler: [fastify.authenticate, requireCoordOrAbove()] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const caso = await prisma.case.update({
      where: { id },
      data: { status: 'archivado' },
      select: { id: true, caseId: true },
    });
    await recordEvent({ caseId: id, userId: request.user.id, action: 'Expediente archivado', type: 'estado' });
    return { ok: true, caseId: caso.caseId };
  });
};

export default caseRoutes;
