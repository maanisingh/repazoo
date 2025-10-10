import { Queue, QueueOptions } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import type { AuthJobData, TwitterOAuthJobData, ScanJobData, TweetJobData } from '../types/index.js';

const connection = createRedisConnection();

const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Authentication Queue
export const authQueue = new Queue<AuthJobData>('auth', defaultQueueOptions);

// Twitter OAuth Queue
export const twitterOAuthQueue = new Queue<TwitterOAuthJobData>('twitter-oauth', defaultQueueOptions);

// Reputation Scan Queue
export const scanQueue = new Queue<ScanJobData>('reputation-scan', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 2,
  },
});

// Tweet Actions Queue
export const tweetQueue = new Queue<TweetJobData>('tweet-actions', defaultQueueOptions);

console.log('✅ BullMQ Queues initialized');

export const queues = {
  auth: authQueue,
  twitterOAuth: twitterOAuthQueue,
  scan: scanQueue,
  tweet: tweetQueue,
};
