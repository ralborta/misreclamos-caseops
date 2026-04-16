import { prisma } from './prisma';

export async function generateCaseId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MR-${year}-`;

  const last = await prisma.case.findFirst({
    where: { caseId: { startsWith: prefix } },
    orderBy: { caseId: 'desc' },
    select: { caseId: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last.caseId.split('-');
    const lastNum = parseInt(parts[2] ?? '0', 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}
