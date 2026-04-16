import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { recordEvent } from '../services/timeline.service';

// Mapeo prioridad Intake -> CaseOps
const priorityMap: Record<string, 'urgente' | 'alta' | 'media' | 'baja'> = {
  URGENT: 'urgente',
  HIGH:   'alta',
  NORMAL: 'media',
  LOW:    'baja',
};

// Mapeo legalType Intake -> materia CaseOps
const materiaMap: Record<string, string> = {
  LABORAL:      'laboral',
  SALUD:        'salud',
  CONSUMIDOR:   'consumidor',
  SUCESION:     'sucesion',
  ACCIDENTE:    'accidente',
  FAMILIA:      'familia',
  PREVISIONAL:  'previsional',
  CIVIL:        'civil',
  // variantes en minúscula o con espacios
  laboral:      'laboral',
  salud:        'salud',
  consumidor:   'consumidor',
  sucesion:     'sucesion',
  accidente:    'accidente',
  familia:      'familia',
  previsional:  'previsional',
  civil:        'civil',
};

// Payload que Intake envía a CaseOps
const intakeWebhookSchema = z.object({
  // Case ID generado por Intake (ej: MR-2024-00341 o el código propio del Ticket)
  ticketCode: z.string().min(1),

  // Datos del caso
  title:    z.string().min(1).optional(),
  legalType: z.string().optional(),       // legalType de Intake → materia en CaseOps
  category:  z.string().optional(),       // categoria → subtype
  priority:  z.string().default('NORMAL'), // LOW | NORMAL | HIGH | URGENT
  channel:   z.string().default('whatsapp'),
  summary:   z.string().optional(),       // resumen generado por IA en Intake

  // Datos del cliente
  customer: z.object({
    name:     z.string().min(1),
    phone:    z.string().optional(),
    email:    z.string().email().optional().or(z.literal('')),
    dni:      z.string().optional(),
    address:  z.string().optional(),
    city:     z.string().optional(),
    province: z.string().optional(),
  }),

  // Contexto adicional del bot (opcional)
  conversationContext: z.string().optional(),
  initialDocuments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    url:  z.string().optional(),
    legalIntelDocumentId: z.string().optional(),
  })).optional(),

  // Metadatos de Intake para trazabilidad
  intakeTicketId: z.string().optional(),
  intakeCreatedAt: z.string().datetime().optional(),
});

const intakeRoutes: FastifyPluginAsync = async (fastify) => {

  // Middleware: validar API key compartida con Intake
  const validateIntakeKey = async (request: any, reply: any) => {
    const secret = process.env['INTAKE_WEBHOOK_SECRET'];
    const incoming = request.headers['x-intake-secret'] ?? request.headers['authorization']?.replace('Bearer ', '');
    if (secret && incoming !== secret) {
      return reply.code(401).send({ error: 'Webhook secret inválido' });
    }
  };

  // POST /intake/webhook — recibe nuevo caso desde Intake
  fastify.post('/intake/webhook', { preHandler: [validateIntakeKey] }, async (request, reply) => {
    const body = intakeWebhookSchema.parse(request.body);

    // Evitar duplicados — si ya existe el caseId, devolver el existente
    const existing = await prisma.case.findUnique({
      where: { caseId: body.ticketCode },
      include: { client: true },
    });
    if (existing) {
      return reply.code(200).send({ ok: true, case: existing, duplicate: true });
    }

    // Mapear prioridad y materia
    const priority = priorityMap[body.priority] ?? 'media';
    const rawMateria = body.legalType ?? '';
    const materia = (materiaMap[rawMateria] ?? materiaMap[rawMateria.toLowerCase()] ?? 'civil') as
      'laboral' | 'salud' | 'consumidor' | 'sucesion' | 'accidente' | 'familia' | 'previsional' | 'civil';

    // Crear cliente
    const client = await prisma.client.create({
      data: {
        name:     body.customer.name,
        phone:    body.customer.phone,
        email:    body.customer.email || undefined,
        dni:      body.customer.dni ?? 'No informado',
        address:  body.customer.address,
        city:     body.customer.city,
        province: body.customer.province,
        consent:  true, // si llegó desde Intake ya aceptó T&C
      },
    });

    // Construir título si no viene
    const title = body.title
      ?? `Caso ${materia} — ${body.customer.name}`;

    // Crear el caso en CaseOps
    const caso = await prisma.case.create({
      data: {
        caseId:   body.ticketCode,
        title,
        materia,
        subtype:  body.category ?? 'No especificado',
        priority,
        channel:  body.channel,
        summary:  body.summary,
        isUrgent: priority === 'urgente',
        clientId: client.id,
        // Agregar contexto de conversación al summary si existe
        ...(body.conversationContext ? {
          summary: [body.summary, `\n\n---\n**Contexto Intake:**\n${body.conversationContext}`]
            .filter(Boolean).join(''),
        } : {}),
      },
      include: {
        client: true,
        assignedLawyer: { select: { id: true, name: true } },
      },
    });

    // Timeline: creación desde Intake
    await recordEvent({
      caseId: caso.id,
      action: `Caso recibido desde MisReclamos Intake (código: ${body.ticketCode})`,
      detail: body.summary ?? undefined,
      type:   'creacion',
    });

    // Registrar documentos iniciales si los hay
    if (body.initialDocuments?.length) {
      await prisma.document.createMany({
        data: body.initialDocuments.map(doc => ({
          caseId:               caso.id,
          name:                 doc.name,
          type:                 doc.type,
          linkedLegalIntel:     !!doc.legalIntelDocumentId,
          legalIntelDocumentId: doc.legalIntelDocumentId,
        })),
      });

      await recordEvent({
        caseId: caso.id,
        action: `${body.initialDocuments.length} documento(s) inicial(es) recibido(s) desde Intake`,
        type:   'documento',
      });
    }

    reply.code(201);
    return {
      ok: true,
      case: {
        id:       caso.id,
        caseId:   caso.caseId,
        title:    caso.title,
        materia:  caso.materia,
        priority: caso.priority,
        status:   caso.status,
        clientId: client.id,
      },
    };
  });

  // GET /intake/case/:ticketCode — Intake puede consultar el estado de un caso
  fastify.get('/intake/case/:ticketCode', { preHandler: [validateIntakeKey] }, async (request, reply) => {
    const { ticketCode } = request.params as { ticketCode: string };

    const caso = await prisma.case.findUnique({
      where: { caseId: ticketCode },
      include: {
        client:        true,
        assignedLawyer: { select: { id: true, name: true, email: true } },
        coordinator:    { select: { id: true, name: true } },
        tasks:         { where: { status: { not: 'completada' } }, select: { id: true, title: true, dueDate: true, status: true } },
        _count:        { select: { documents: true, notes: true } },
      },
    });

    if (!caso) return reply.code(404).send({ error: 'Caso no encontrado en CaseOps' });

    return {
      id:             caso.id,
      caseId:         caso.caseId,
      title:          caso.title,
      status:         caso.status,
      stage:          caso.stage,
      priority:       caso.priority,
      materia:        caso.materia,
      assignedLawyer: caso.assignedLawyer,
      isDormant:      caso.isDormant,
      isUrgent:       caso.isUrgent,
      lastActivity:   caso.lastActivity,
      nextAction:     caso.nextAction,
      nextActionDate: caso.nextActionDate,
      pendingTasks:   caso.tasks,
      counts:         caso._count,
    };
  });
};

export default intakeRoutes;
