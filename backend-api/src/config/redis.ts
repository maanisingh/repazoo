import { Redis } from 'ioredis';
import { config } from './env.js';

// Support both REDIS_URL and individual config
const createRedisClient = (): Redis => {
  if (config.REDIS_URL && config.REDIS_URL.startsWith('redis://')) {
    return new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }
  return new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
};

export const redis = createRedisClient();

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export const createRedisConnection = (): Redis => {
  return createRedisClient();
};
