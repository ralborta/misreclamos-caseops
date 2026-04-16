import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { config } from '../config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.active) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const accessToken = fastify.jwt.sign(payload, { expiresIn: '8h' });
    const refreshToken = fastify.jwt.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    try {
      const decoded = fastify.jwt.verify<{ id: string; email: string; role: string; name: string }>(refreshToken);
      const user = await prisma.user.findUnique({ where: { id: decoded.id, active: true } });
      if (!user) return reply.code(401).send({ error: 'Token inválido' });
      const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
      const accessToken = fastify.jwt.sign(payload, { expiresIn: '8h' });
      return { accessToken };
    } catch {
      return reply.code(401).send({ error: 'Refresh token inválido o expirado' });
    }
  });

  // GET /auth/me
  fastify.get('/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    return user;
  });
};

export default authRoutes;
