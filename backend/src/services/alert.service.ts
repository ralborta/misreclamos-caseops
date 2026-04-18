import type { CaseStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { config } from '../config';

const ACTIVE_CASE_STATUSES: CaseStatus[] = [
  'nuevo', 'en_revision', 'asignado', 'en_gestion',
  'esperando_documentacion', 'en_negociacion', 'judicializado',
];

export async function runAlertDetection() {
  const now = new Date();
  const dormantThreshold = new Date(now.getTime() - config.DORMANT_DAYS_THRESHOLD * 86400000);
  const in48h = new Date(now.getTime() + 48 * 3600000);

  // 1. Casos dormidos
  const dormantCases = await prisma.case.findMany({
    where: {
      status: { in: ACTIVE_CASE_STATUSES },
      lastActivity: { lt: dormantThreshold },
      isDormant: false,
    },
    select: { id: true, caseId: true },
  });

  for (const c of dormantCases) {
    await prisma.case.update({ where: { id: c.id }, data: { isDormant: true } });
    await prisma.alert.upsert({
      where: { id: `dormant-${c.id}` },
      create: {
        id: `dormant-${c.id}`,
        caseId: c.id,
        type: 'dormido',
        message: `Expediente ${c.caseId} sin actividad hace más de ${config.DORMANT_DAYS_THRESHOLD} días`,
      },
      update: { resolved: false, createdAt: now },
    });
  }

  // Reset isDormant for recently active cases
  await prisma.case.updateMany({
    where: { isDormant: true, lastActivity: { gte: dormantThreshold } },
    data: { isDormant: false },
  });

  // 2. Tareas vencidas
  const overdueTasks = await prisma.task.findMany({
    where: { dueDate: { lt: now }, status: { in: ['pendiente', 'en_curso'] } },
    select: { id: true, title: true, caseId: true, case: { select: { caseId: true } } },
  });

  for (const t of overdueTasks) {
    await prisma.task.update({ where: { id: t.id }, data: { status: 'vencida' } });
    await prisma.alert.updateMany({
      where: { id: `task-upcoming-${t.id}` },
      data: { resolved: true, resolvedAt: now },
    });
    await prisma.alert.upsert({
      where: { id: `task-overdue-${t.id}` },
      create: {
        id: `task-overdue-${t.id}`,
        caseId: t.caseId,
        type: 'tarea_vencida',
        message: `Tarea vencida en ${t.case.caseId}: "${t.title}"`,
      },
      update: { resolved: false },
    });
  }

  // 3. Casos sin abogado asignado (activos)
  const unassigned = await prisma.case.findMany({
    where: { status: { in: ACTIVE_CASE_STATUSES }, assignedLawyerId: null },
    select: { id: true, caseId: true },
  });

  for (const c of unassigned) {
    await prisma.alert.upsert({
      where: { id: `unassigned-${c.id}` },
      create: {
        id: `unassigned-${c.id}`,
        caseId: c.id,
        type: 'sin_asignar',
        message: `Expediente ${c.caseId} activo sin abogado asignado`,
      },
      update: { resolved: false },
    });
  }

  // 4. Próximos vencimientos (48h)
  const upcoming = await prisma.case.findMany({
    where: {
      status: { in: ACTIVE_CASE_STATUSES },
      nextActionDate: { gte: now, lte: in48h },
    },
    select: { id: true, caseId: true, nextAction: true },
  });

  for (const c of upcoming) {
    await prisma.alert.upsert({
      where: { id: `upcoming-${c.id}` },
      create: {
        id: `upcoming-${c.id}`,
        caseId: c.id,
        type: 'vencimiento_proximo',
        message: `Próxima acción en ${c.caseId} vence en menos de 48h: "${c.nextAction ?? 'Sin descripción'}"`,
      },
      update: { resolved: false },
    });
  }

  // 5. Tareas con vencimiento en los próximos 7 días (aún pendientes o en curso)
  const in7d = new Date(now.getTime() + 7 * 24 * 3600000);
  const upcomingTasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: in7d },
      status: { in: ['pendiente', 'en_curso'] },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      caseId: true,
      case: { select: { caseId: true } },
    },
  });

  for (const t of upcomingTasks) {
    const dueStr = t.dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    await prisma.alert.upsert({
      where: { id: `task-upcoming-${t.id}` },
      create: {
        id: `task-upcoming-${t.id}`,
        caseId: t.caseId,
        type: 'tarea_proxima',
        message: `Tarea próxima — ${t.case.caseId}: "${t.title}" · vence ${dueStr}`,
      },
      update: { resolved: false },
    });
  }

  // Limpiar alertas "próxima" si la tarea ya no aplica (fecha movida fuera de ventana o completada)
  const staleUpcomingRows = await prisma.alert.findMany({
    where: { type: 'tarea_proxima', resolved: false },
    select: { id: true },
  });
  for (const a of staleUpcomingRows) {
    if (!a.id.startsWith('task-upcoming-')) continue;
    const taskId = a.id.replace('task-upcoming-', '');
    const stillValid = upcomingTasks.some((x) => x.id === taskId);
    if (!stillValid) {
      await prisma.alert.update({ where: { id: a.id }, data: { resolved: true, resolvedAt: now } });
    }
  }

  console.log(`[alerts] dormidos:${dormantCases.length} vencidas:${overdueTasks.length} sin_asignar:${unassigned.length} próximos:${upcoming.length} tareas_próximas:${upcomingTasks.length}`);
}
