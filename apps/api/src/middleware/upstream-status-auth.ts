import { Request, Response, NextFunction } from 'express';

/**
 * When `AI_UPSTREAM_STATUS_SECRET` is set, GET /api/chat/upstream-status requires:
 * header `x-ai-status-secret: <secret>` or `Authorization: Bearer <secret>`.
 * When unset, the route is open (local dev / trusted network only).
 */
export function requireUpstreamStatusAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.AI_UPSTREAM_STATUS_SECRET?.trim();
  if (!secret) {
    next();
    return;
  }
  const fromHeader =
    typeof req.headers['x-ai-status-secret'] === 'string' ? req.headers['x-ai-status-secret'] : undefined;
  const bearer =
    req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
  if ((fromHeader || bearer) === secret) {
    next();
    return;
  }
  res.status(401).json({ success: false, error: 'Unauthorized' });
}
