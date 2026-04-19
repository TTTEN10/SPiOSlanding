/**
 * Security Audit Logging (ISO 27001 A.12.4.1 / Annex A 8.15)
 *
 * Records security-relevant events (auth success/failure, access denied) for
 * audit trail and incident response. Logs are stored in DB and must not
 * contain PII or secrets; use redacted/hashed identifiers (e.g. wallet prefix).
 */

import { prisma } from './prisma';
import logger from './logger';

function getIpAddress(req: any): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0]?.trim() || null;
  }
  return req.ip || req.connection?.remoteAddress || null;
}

/** Redact wallet for audit log: keep first 6 and last 4 chars (e.g. 0x1234...abcd) */
export function redactWalletForAudit(address: string | undefined | null): string | null {
  if (!address || address.length < 12) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT'
  | 'INVALID_INPUT';

export async function logSecurityEvent(params: {
  eventType: SecurityEventType;
  actor?: string | null;
  resource?: string | null;
  success: boolean;
  req?: any;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const ipAddress = params.req ? getIpAddress(params.req) : null;
    const userAgent = params.req?.headers?.['user-agent'] || null;
    const detailsJson =
      params.details && Object.keys(params.details).length > 0
        ? JSON.stringify(params.details)
        : null;

    await prisma.securityAuditLog.create({
      data: {
        eventType: params.eventType,
        actor: params.actor ?? null,
        resource: params.resource ?? null,
        success: params.success,
        ipAddress,
        userAgent,
        details: detailsJson,
      },
    });

    logger.info(`Security audit: ${params.eventType}`, {
      resource: params.resource,
      success: params.success,
    });
  } catch (error: any) {
    logger.error('Failed to write security audit log', { error: error?.message });
  }
}
