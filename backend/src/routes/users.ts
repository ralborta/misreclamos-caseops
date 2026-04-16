import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAdmin, requireCoordOrAbove } from '../middleware/roles';

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'coordinador', 'abogado_interno', 'abogado_asociado', 'readonly']).default('abogado_interno'),
});

const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['admin', 'coordinador', 'abogado_interno', 'abogado_asociado', 'readonly']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const authAdmin = { preHandler: [fastify.authenticate, requireAdmin()] };
  const authCoord = { preHandler: [fastify.authenticate, requireCoordOrAbove()] };

  // GET /users — lista (coordinador+ puede ver)
  fastify.get('/users', authCoord, async () => {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, _count: { select: { assignedCases: true } } },
      orderBy: { name: 'asc' },
    });
  });

  // GET /users/:id
  fastify.get('/users/:id', authCoord, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });
    return user;
  });

  // POST /users (admin only)
  fastify.post('/users', authAdmin, async (request, reply) => {
    const body = userCreateSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, name: body.name, role: body.role },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    reply.code(201);
    return user;
  });

  // PATCH /users/:id (admin only)
  fastify.patch('/users/:id', authAdmin, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = userUpdateSchema.parse(request.body);
    const data: Record<string, unknown> = { ...body };
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 12);
      delete data.password;
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    return user;
  });

  // DELETE /users/:id (soft delete — admin only)
  fastify.delete('/users/:id', authAdmin, async (request) => {
    const { id } = request.params as { id: string };
    await prisma.user.update({ where: { id }, data: { active: false } });
    return { ok: true };
  });
};

export default userRoutes;
