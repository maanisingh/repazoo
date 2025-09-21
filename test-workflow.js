const { Client } = require('@temporalio/client');

async function testWorkflow() {
  console.log('Connecting to Temporal...');

  try {
    const client = new Client({
      connection: {
        address: 'localhost:7233',
      },
      namespace: 'default',
    });

    console.log('Starting test workflow...');

    const handle = await client.workflow.start('emailVerificationWorkflow', {
      args: [{
        userId: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test User'
      }],
      taskQueue: 'repazoo-tasks',
      workflowId: 'test-email-verification-' + Date.now(),
    });

    console.log('Test workflow started!');
    console.log('Workflow ID:', handle.workflowId);
    console.log('Run ID:', handle.runId);
    console.log('Check Temporal UI at: http://localhost:8233');

  } catch (error) {
    console.error('Error starting workflow:', error);
  }
}

testWorkflow();