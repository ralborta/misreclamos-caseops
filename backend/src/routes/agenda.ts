import type { FastifyPluginAsync } from 'fastify';
import type { CaseStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

const OPEN_CASE: { notIn: CaseStatus[] } = { notIn: ['cerrado', 'archivado'] };

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(d: Date) {
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

const agendaRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/agenda', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = request.user;
    const now = new Date();

    const caseWhere =
      user.role === 'abogado_asociado'
        ? { assignedLawyerId: user.id, status: OPEN_CASE }
        : { status: OPEN_CASE };

    const weekStart = startOfWeekMonday(now);
    const weekEnd = endOfWeekSunday(now);

    const tasksInWeek = await prisma.task.findMany({
      where: {
        status: { in: ['pendiente', 'en_curso', 'vencida'] },
        dueDate: { gte: weekStart, lte: weekEnd },
        case: caseWhere,
      },
      include: {
        case: { select: { id: true, caseId: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const horizon = new Date(now.getTime() + 14 * 24 * 3600000);
    const upcomingSoon = await prisma.task.findMany({
      where: {
        status: { in: ['pendiente', 'en_curso'] },
        dueDate: { gte: now, lte: horizon },
        case: caseWhere,
      },
      include: {
        case: { select: { id: true, caseId: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    const overdueOpen = await prisma.task.findMany({
      where: {
        status: 'vencida',
        case: caseWhere,
      },
      include: {
        case: { select: { id: true, caseId: true, title: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 30,
    });

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      tasksInWeek,
      upcomingSoon,
      overdueOpen,
    };
  });
};

export default agendaRoutes;
