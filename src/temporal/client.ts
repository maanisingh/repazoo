import { Client } from '@temporalio/client';

// Create a Temporal client
let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    client = new Client({
      // Default to local Temporal server
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      // Add authentication if needed in production
      // tls: process.env.NODE_ENV === 'production' ? { serverName: 'temporal' } : false,
    });
  }
  return client;
}

export async function closeTemporalClient(): Promise<void> {
  if (client) {
    client.connection.close();
    client = null;
  }
}