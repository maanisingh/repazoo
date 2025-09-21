import { config } from 'dotenv';
import { Worker } from '@temporalio/worker';
import * as emailActivities from '../activities/email';
import * as monitoringActivities from '../activities/monitoring';

// Load environment variables
config();

export async function createWorker(): Promise<Worker> {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows'),
    activities: {
      ...emailActivities,
      ...monitoringActivities,
    },
    taskQueue: 'repazoo-tasks',
    // Configure worker options
    maxConcurrentActivityTaskExecutions: 10,
    maxConcurrentWorkflowTaskExecutions: 10,
    // Add logging
    interceptors: {
      workflowModules: [],
      activityInbound: [],
    },
  });

  return worker;
}

// Main worker startup function
export async function startWorker(): Promise<void> {
  console.log('Starting Temporal worker...');

  try {
    const worker = await createWorker();

    // Run the worker
    console.log('Temporal worker started successfully. Listening for tasks...');
    await worker.run();
  } catch (error) {
    console.error('Failed to start Temporal worker:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start worker if this file is run directly
if (require.main === module) {
  startWorker().catch(console.error);
}