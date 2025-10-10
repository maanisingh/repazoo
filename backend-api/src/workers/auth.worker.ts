import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { authService } from '../services/auth.service.js';
import type { AuthJobData } from '../types/index.js';

const connection = createRedisConnection();

export const authWorker = new Worker<AuthJobData>(
  'auth',
  async (job: Job<AuthJobData>) => {
    const { type, email, password, full_name } = job.data;

    console.log(`Processing auth job: ${type} for ${email}`);

    try {
      switch (type) {
        case 'register':
          if (!password || !full_name) {
            throw new Error('Password and full_name required for registration');
          }
          const registerResult = await authService.registerUser(email, password, full_name);

          if (!registerResult.success) {
            throw new Error(registerResult.message || 'Registration failed');
          }

          return {
            success: true,
            user_id: registerResult.user_id,
            message: registerResult.message,
          };

        case 'login':
          if (!password) {
            throw new Error('Password required for login');
          }
          const loginResult = await authService.loginUser(email, password);

          if (!loginResult.success) {
            throw new Error(loginResult.message || 'Login failed');
          }

          return {
            success: true,
            token: loginResult.token,
            user_id: loginResult.user_id,
            message: loginResult.message,
          };

        case 'password-reset':
          const resetResult = await authService.requestPasswordReset(email);

          return {
            success: resetResult.success,
            message: resetResult.message,
          };

        default:
          throw new Error(`Unknown auth job type: ${type}`);
      }
    } catch (error) {
      console.error(`Auth job failed for ${type}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

authWorker.on('completed', (job) => {
  console.log(`✅ Auth job ${job.id} completed: ${job.data.type} for ${job.data.email}`);
});

authWorker.on('failed', (job, err) => {
  console.error(`❌ Auth job ${job?.id} failed:`, err.message);
});

console.log('✅ Auth worker started');
