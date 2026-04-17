import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY || '');

export interface GeneratedTask {
  title: string;
  description: string;
  daysFromNow: number;
  priority: 'urgente' | 'alta' | 'media' | 'baja';
  type: string;
}

const LEGAL_CONTEXT = `
Sos un experto en derecho argentino con amplio conocimiento en:
- Derecho laboral (LCT, Ley 24.557, plazos TCL, SECLO, prescripción 2 años)
- Derecho del consumidor (Ley 24.240, mediación previa obligatoria)
- Derecho de la salud (amparos, medidas cautelares, Ley 26.682 prepagas, Ley 23.661 PAMI)
- Accidentes de tránsito (Ley 24.449, prescripción 3 años, mediación)
- Derecho sucesorio (CCCN, declaratoria de herederos, inventario, tracto)
- Derecho de familia (alimentos, divorcio, tenencia)
- Derecho previsional (ANSES, jubilaciones, pensiones)
- Derecho civil general (daños y perjuicios, contratos)

Conocés los plazos procesales específicos de Argentina:
- Plazos de contestación de demanda por fuero
- Plazos de mediación previa obligatoria
- Plazos de prescripción por materia
- Términos procesales en justicia laboral, civil, comercial
- Plazos en organismos administrativos (SRT, AFIP, ANSES, Defensa del Consumidor)
`;

const MATERIA_HINTS: Record<string, string> = {
  laboral: `
Materia LABORAL. Considerá estos hitos típicos según el subtipo:
- Despido: TCL de alícuota, intimación, respuesta, SECLO (plazo ~45 días), demanda laboral
- Accidente laboral: denuncia SRT, ILT, alta médica, determinación incapacidad, demanda civil
- Diferencias salariales: liquidación, intimación, SECLO, demanda
- Jornada/categoría: auditoría laboral, intimación, SECLO
Plazos clave: TCL tiene 2 días hábiles, SECLO audiencia ~45 días desde inicio, prescripción 2 años.`,

  salud: `
Materia SALUD / COBERTURA MÉDICA. Hitos típicos:
- Amparo de salud: requerimiento previo a la obra social/prepaga (48hs), presentación judicial urgente, medida cautelar, seguimiento de cumplimiento
- Cobertura medicamentos: intimación fehaciente, plazo de respuesta 48-72hs, acción judicial
- Prótesis/tratamientos: documentación médica, pericia, demanda
Plazos clave: amparos son URGENTES, medida cautelar suele resolverse en 24-48hs hábiles.`,

  consumidor: `
Materia CONSUMIDOR. Hitos típicos:
- Denuncia en Defensa del Consumidor (OMIC/COPREC)
- Mediación previa obligatoria (Ley 26.993 para montos pequeños)
- Audiencia de conciliación
- Demanda judicial si no hay acuerdo
- Daño punitivo y daño moral
Plazos clave: prescripción 3 años Ley 24.240, mediación previa es obligatoria.`,

  accidente: `
Materia ACCIDENTE DE TRÁNSITO. Hitos típicos:
- Recopilación de documentación (acta policial, médica, fotos)
- Notificación a aseguradora
- Mediación prejudicial obligatoria
- Pericia médica / valuación de daños
- Demanda civil si no hay acuerdo
Plazos clave: prescripción 3 años (Ley 24.449), mediación previa obligatoria en CABA y PBA.`,

  sucesion: `
Materia SUCESIÓN. Hitos típicos:
- Validación de vínculo y documentación (acta de defunción, DNI, partidas)
- Presentación de declaratoria de herederos
- Apertura del sucesorio
- Inventario y avalúo de bienes
- Tracto abreviado / escrituración
- Cierre del proceso
Plazos clave: no hay prescripción para suceder, pero los trámites registrales tienen plazos administrativos.`,

  familia: `
Materia FAMILIA. Hitos típicos:
- Mediación familiar previa obligatoria
- Acuerdo o litigio (alimentos, tenencia, régimen de visitas)
- Homologación judicial
- Seguimiento de cumplimiento de cuota
Plazos clave: alimentos provisorios pueden pedirse en 48hs, cuota definitiva requiere proceso.`,

  previsional: `
Materia PREVISIONAL / ANSES. Hitos típicos:
- Recopilación de aportes y certificaciones de servicios
- Solicitud ante ANSES
- Impugnación de resolución denegatoria
- Recurso judicial (Cámara Federal de la Seguridad Social)
Plazos clave: 90 días para resolver solicitud ANSES, prescripción 2 años para diferencias.`,

  civil: `
Materia CIVIL (daños, contratos, etc.). Hitos típicos:
- Carta documento / intimación fehaciente
- Mediación prejudicial obligatoria
- Demanda civil
- Apertura a prueba
- Alegatos
- Sentencia
Plazos clave: prescripción varía (1-5 años según subtipo), mediación es obligatoria en CABA y PBA.`,
};

export async function generateTaskSchedule(caseData: {
  materia: string;
  subtype: string;
  title: string;
  summary?: string;
  stage?: string;
}): Promise<GeneratedTask[]> {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const materiaHint = MATERIA_HINTS[caseData.materia] || '';

  const prompt = `${LEGAL_CONTEXT}

${materiaHint}

CASO A ANALIZAR:
- Título: ${caseData.title}
- Materia: ${caseData.materia}
- Subtipo: ${caseData.subtype}
- Etapa actual: ${caseData.stage || 'Inicio'}
- Resumen: ${caseData.summary || 'Sin resumen disponible'}

TAREA: Generá un cronograma procesal completo y realista para este caso.
Devolvé ÚNICAMENTE un JSON válido con este formato exacto, sin texto adicional:

{
  "tasks": [
    {
      "title": "Nombre corto de la acción procesal",
      "description": "Detalle de qué hay que hacer, qué documentos, qué organismo, etc.",
      "daysFromNow": 3,
      "priority": "alta",
      "type": "Categoría (Documentación|Procesal|Notificaciones|Cautelar|Interno)"
    }
  ]
}

REGLAS:
- Generá entre 5 y 12 tareas ordenadas cronológicamente
- daysFromNow debe ser un número entero positivo desde hoy
- priority debe ser exactamente: "urgente", "alta", "media" o "baja"
- Usá plazos legales reales de Argentina
- Si el caso está en una etapa avanzada, saltá las tareas ya superadas
- Priorizá las acciones más críticas y con plazo fijo primero
- Incluí recordatorios de vencimiento de prescripción si corresponde
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extraer JSON aunque venga con markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Respuesta de Gemini no contiene JSON válido');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.tasks)) throw new Error('Formato de respuesta inválido');

  return parsed.tasks;
}
