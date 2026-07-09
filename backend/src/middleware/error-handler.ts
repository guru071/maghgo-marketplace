import { Request, Response, NextFunction } from 'express';

// ─── Global Error Handler ────────────────────────────────────────────────────

/**
 * Express error-handling middleware.
 * Catches all unhandled errors thrown in route handlers / middleware,
 * logs them, and returns a safe 500 response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('🔥 Unhandled error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
}
