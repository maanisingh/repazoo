import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().default('development_secret_change_in_prod'),
  TWITTER_CLIENT_ID: z.string(),
  TWITTER_CLIENT_SECRET: z.string(),
  TWITTER_CALLBACK_URL: z.string().default('http://localhost:3000/api/twitter/oauth/callback'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default('https://ntf.repazoo.com'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3:8b'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const config = {
  PORT: parseInt(parsed.data.PORT),
  NODE_ENV: parsed.data.NODE_ENV,
  DATABASE_URL: parsed.data.DATABASE_URL,
  REDIS_URL: parsed.data.REDIS_URL,
  REDIS_HOST: parsed.data.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(parsed.data.REDIS_PORT || '6379'),
  REDIS_PASSWORD: parsed.data.REDIS_PASSWORD,
  JWT_SECRET: parsed.data.JWT_SECRET,
  TWITTER_CLIENT_ID: parsed.data.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET: parsed.data.TWITTER_CLIENT_SECRET,
  TWITTER_CALLBACK_URL: parsed.data.TWITTER_CALLBACK_URL,
  STRIPE_SECRET_KEY: parsed.data.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: parsed.data.STRIPE_WEBHOOK_SECRET,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
  OLLAMA_BASE_URL: parsed.data.OLLAMA_BASE_URL,
  OLLAMA_MODEL: parsed.data.OLLAMA_MODEL,
};
