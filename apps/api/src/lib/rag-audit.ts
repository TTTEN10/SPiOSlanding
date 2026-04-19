/**
 * RAG Audit Logging Service
 * 
 * Provides audit logging for RAG indexing operations.
 * Tracks all indexing, deletion, and batch operations for security and compliance.
 */

import { prisma } from './prisma';
import logger from './logger';
import { RAGOperation } from '@prisma/client';

/**
 * Get IP address from request
 */
function getIpAddress(req: any): string | null {
  // Check various headers for real IP (trust proxy should be enabled)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0]?.trim() || null;
  }
  
  return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Log a RAG operation to the audit log
 */
export async function logRAGOperation(params: {
  operation: RAGOperation;
  walletAddress?: string | null;
  documentId?: string | null;
  source?: string | null;
  documentSize?: number | null;
  success: boolean;
  errorMessage?: string | null;
  req?: any; // Express request object for IP/User-Agent
}): Promise<void> {
  try {
    const ipAddress = params.req ? getIpAddress(params.req) : null;
    const userAgent = params.req?.headers?.['user-agent'] || null;

    await prisma.rAGAuditLog.create({
      data: {
        operation: params.operation,
        walletAddress: params.walletAddress?.toLowerCase() || null,
        documentId: params.documentId || null,
        source: params.source || null,
        documentSize: params.documentSize || null,
        success: params.success,
        errorMessage: params.errorMessage || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    if (params.success) {
      logger.info(`RAG audit log: ${params.operation} - ${params.documentId || 'N/A'} - Success`);
    } else {
      logger.warn(`RAG audit log: ${params.operation} - ${params.documentId || 'N/A'} - Failed: ${params.errorMessage || 'Unknown error'}`);
    }
  } catch (error: any) {
    // Don't fail the operation if audit logging fails
    logger.error('Failed to log RAG operation to audit log:', error);
  }
}

/**
 * Get audit logs with optional filters
 */
export async function getRAGAuditLogs(params: {
  operation?: RAGOperation;
  walletAddress?: string;
  documentId?: string;
  source?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (params.operation) {
      where.operation = params.operation;
    }
    if (params.walletAddress) {
      where.walletAddress = params.walletAddress.toLowerCase();
    }
    if (params.documentId) {
      where.documentId = params.documentId;
    }
    if (params.source) {
      where.source = params.source;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    const logs = await prisma.rAGAuditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: params.limit || 100,
      skip: params.offset || 0,
    });

    const total = await prisma.rAGAuditLog.count({ where });

    return {
      logs,
      total,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };
  } catch (error: any) {
    logger.error('Failed to get RAG audit logs:', error);
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
}

