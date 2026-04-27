import { prisma } from '../utils/prisma';
import { config } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { recordEvent } from './timeline.service';

const genAI = config.GEMINI_API_KEY ? new GoogleGenerativeAI(config.GEMINI_API_KEY) : null;

type RegenerationReason = 'manual' | 'note_created' | 'note_updated' | 'note_deleted' | 'document_created' | 'document_deleted';

function reasonLabel(reason: RegenerationReason) {
  switch (reason) {
    case 'manual': return 'manual';
    case 'note_created': return 'alta de nota';
    case 'note_updated': return 'edicion de nota';
    case 'note_deleted': return 'eliminacion de nota';
    case 'document_created': return 'alta de documento';
    case 'document_deleted': return 'eliminacion de documento';
    default: return 'actualizacion';
  }
}

function buildStructuredFallback(input: {
  title: string;
  caseCode: string;
  materia: string;
  subtype: string;
  status: string;
  stage: string;
  summary?: string | null;
  notes: Array<{ type: string; content: string; createdAt: Date }>;
  documents: Array<{ name: string; type: string; stage?: string | null; createdAt: Date }>;
}) {
  const notesOrdered = [...input.notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const docsOrdered = [...input.documents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const notesLines = notesOrdered.slice(0, 8).map((n) => `- [${n.type}] ${n.content.trim().slice(0, 180)}`);
  const docsLines = docsOrdered.slice(0, 8).map((d) => `- ${d.name} (${d.type}${d.stage ? `, etapa: ${d.stage}` : ''})`);

  return [
    `Caso ${input.caseCode}: ${input.title}`,
    `Materia: ${input.materia} | Subtipo: ${input.subtype}`,
    `Estado: ${input.status} | Etapa: ${input.stage}`,
    '',
    'Resumen base:',
    input.summary?.trim() ? input.summary.trim() : '- Sin resumen inicial cargado.',
    '',
    'Notas relevantes (recientes):',
    notesLines.length ? notesLines.join('\n') : '- Sin notas registradas.',
    '',
    'Documentos asociados (recientes):',
    docsLines.length ? docsLines.join('\n') : '- Sin documentos registrados.',
  ].join('\n');
}

async function generateWithGeminiIfAvailable(contextText: string): Promise<string | null> {
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
  const prompt = `
Sos un asistente legal para Argentina.
Con la informacion del expediente, redacta un resumen consolidado en espanol, claro y accionable.

Formato obligatorio:
1) "Estado del caso" (1-2 lineas)
2) "Hechos y contexto" (2-4 bullets)
3) "Notas clave del equipo" (2-4 bullets)
4) "Documentacion relevante" (2-4 bullets)
5) "Proximos pasos sugeridos" (2-4 bullets)

Reglas:
- No inventes datos.
- Si falta informacion, explicitarlo brevemente.
- Maximo 3500 caracteres.

DATOS DEL CASO:
${contextText}
`;

  const response = await model.generateContent(prompt);
  const text = response.response.text().trim();
  return text || null;
}

export async function regenerateCaseSummary(params: {
  caseId: string;
  userId?: string;
  reason: RegenerationReason;
}) {
  const caseData = await prisma.case.findUnique({
    where: { id: params.caseId },
    include: {
      notes: {
        select: { type: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      documents: {
        select: { name: true, type: true, stage: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!caseData) return null;

  const context = buildStructuredFallback({
    title: caseData.title,
    caseCode: caseData.caseId,
    materia: caseData.materia,
    subtype: caseData.subtype,
    status: caseData.status,
    stage: caseData.stage,
    summary: caseData.summary,
    notes: caseData.notes,
    documents: caseData.documents,
  });

  let finalSummary = context;
  try {
    const aiSummary = await generateWithGeminiIfAvailable(context);
    if (aiSummary) {
      finalSummary = aiSummary;
    }
  } catch {
    // fallback silencioso al resumen estructurado local
  }

  await prisma.case.update({
    where: { id: params.caseId },
    data: { summary: finalSummary },
  });

  await recordEvent({
    caseId: params.caseId,
    userId: params.userId,
    action: `Resumen del caso regenerado (${reasonLabel(params.reason)})`,
    type: 'hito',
  });

  return { summary: finalSummary };
}
