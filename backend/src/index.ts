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
import { errorHandler } from './middleware/error-handler';

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
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}

// Initialize the daily cleanup cron job
startCleanupJob();

// ─── Middleware ──────────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Request logging
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsing ────────────────────────────────────────────────────────────
// The webhook route needs the raw body for HMAC signature verification.
// We use the `verify` callback to capture it before JSON parsing.

app.use(
  '/webhook',
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// All other routes use standard JSON parsing
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/webhook', webhookRouter);
app.use('/webhook', paymentRouter);
app.use('/demo', demoRouter);
app.use('/health', healthRouter);

// ─── Error Handler ───────────────────────────────────────────────────────────

// The error handler must be before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

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
