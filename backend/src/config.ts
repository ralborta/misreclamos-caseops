import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).default('caseops-dev-secret-change-in-prod'),
  JWT_REFRESH_SECRET: z.string().min(16).default('caseops-refresh-dev-secret-change-in-prod'),
  PORT: z.coerce.number().default(3001),
  LEGAL_INTEL_URL: z.string().url().optional(),
  DORMANT_DAYS_THRESHOLD: z.coerce.number().default(7),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
