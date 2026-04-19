import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { prisma } from './prisma';

// Create a registry for metrics
export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'model', 'status'],
  registers: [register],
});

// Application Metrics
export const emailSubscriptionsTotal = new Counter({
  name: 'email_subscriptions_total',
  help: 'Total number of email subscriptions',
  labelNames: ['role', 'consent_given'],
  registers: [register],
});

export const contactMessagesTotal = new Counter({
  name: 'contact_messages_total',
  help: 'Total number of contact messages',
  registers: [register],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Database connection pool metrics
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
  registers: [register],
});

// Error Metrics
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route'],
  registers: [register],
});

// Function to update database metrics from Prisma
export async function updateDatabaseMetrics() {
  try {
    // Get email subscription count
    const subscriptionCount = await prisma.emailSubscription.count();
    const contactCount = await prisma.contactMessage.count();
    
    // Note: Prisma doesn't expose connection pool metrics directly
    // You might need to query PostgreSQL directly for connection pool stats
    // For now, we'll use a placeholder
    dbConnectionsActive.set(0); // This would need to be updated with actual pool metrics
    
    return {
      subscriptions: subscriptionCount,
      contacts: contactCount,
    };
  } catch (error) {
    console.error('Error updating database metrics:', error);
    return null;
  }
}

// Export metrics in Prometheus format
export async function getMetrics(): Promise<string> {
  // Update database metrics before returning
  await updateDatabaseMetrics();
  return register.metrics();
}

