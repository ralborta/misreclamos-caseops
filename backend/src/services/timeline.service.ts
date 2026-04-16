import { prisma } from '../utils/prisma';
import type { TimelineEventType } from '@prisma/client';

interface RecordEventParams {
  caseId: string;
  userId?: string;
  action: string;
  detail?: string;
  type: TimelineEventType;
}

export async function recordEvent(params: RecordEventParams) {
  const [event] = await Promise.all([
    prisma.timelineEvent.create({
      data: {
        caseId: params.caseId,
        userId: params.userId,
        action: params.action,
        detail: params.detail,
        type: params.type,
      },
    }),
    prisma.case.update({
      where: { id: params.caseId },
      data: { lastActivity: new Date() },
    }),
  ]);
  return event;
}
