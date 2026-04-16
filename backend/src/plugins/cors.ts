import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import { config } from '../config';
import type { FastifyPluginAsync } from 'fastify';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyCors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
  });
};

export default fp(corsPlugin);
