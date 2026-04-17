import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-intake-secret'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
};

export default fp(corsPlugin);
