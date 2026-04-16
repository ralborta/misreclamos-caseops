import type { FastifyRequest, FastifyReply } from 'fastify';

type AllowedRole = 'admin' | 'coordinador' | 'abogado_interno' | 'abogado_asociado' | 'readonly';

export function requireRoles(...roles: AllowedRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role as AllowedRole | undefined;
    if (!userRole || !roles.includes(userRole)) {
      reply.code(403).send({ error: 'Acceso denegado: permisos insuficientes' });
    }
  };
}

export function requireAdmin() {
  return requireRoles('admin');
}

export function requireCoordOrAbove() {
  return requireRoles('admin', 'coordinador');
}

export function requireLawyerOrAbove() {
  return requireRoles('admin', 'coordinador', 'abogado_interno', 'abogado_asociado');
}
