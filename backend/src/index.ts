import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import webhookRouter from './routes/webhook';
import healthRouter from './routes/health';
import { paymentRouter } from './routes/payment';
import demoRouter from './routes/demo';
import { dashboardRouter } from './routes/dashboard';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/error-handler';

// ─── Process Error Handling ──────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

// ─── Express Application ────────────────────────────────────────────────────

import { startCleanupJob } from './jobs/cleanup.job';

const app = express();

// ─── Sentry Initialization (AI Error Tracking) ───────────────────────────────
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Tracing
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// Initialize the daily cleanup cron job
startCleanupJob();

// ─── Middleware ──────────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS - restrict to frontend URL
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsing ────────────────────────────────────────────────────────────
// The webhook route needs the raw body for HMAC signature verification.
// We use the `verify` callback to capture it before JSON parsing.

app.use(
  '/webhook',
  express.json({
    limit: '100kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// All other routes use standard JSON parsing
app.use(express.json({ limit: '100kb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/webhook', webhookRouter);
app.use('/webhook', paymentRouter);
app.use('/demo', demoRouter);
app.use('/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);

// ─── Error Handler ───────────────────────────────────────────────────────────

// The error handler must be before any other error middleware and after all controllers
if (env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║         🚀 Maghgo Backend Server          ║
╠═══════════════════════════════════════════╣
║  Port:        ${String(env.PORT).padEnd(27)}║
║  Environment: ${env.NODE_ENV.padEnd(27)}║
║  Health:      http://localhost:${env.PORT}/health  ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
