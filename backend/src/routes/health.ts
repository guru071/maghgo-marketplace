import { Router, Request, Response } from 'express';

// ─── Health Check Route ──────────────────────────────────────────────────────

const router = Router();

/**
 * GET /health
 * Simple health-check endpoint for uptime monitoring.
 */
router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
