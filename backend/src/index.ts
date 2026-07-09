import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import webhookRouter from './routes/webhook';
import healthRouter from './routes/health';
import { paymentRouter } from './routes/payment';
import { errorHandler } from './middleware/error-handler';

// ─── Express Application ────────────────────────────────────────────────────

const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────

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
app.use('/health', healthRouter);

// ─── Error Handler ───────────────────────────────────────────────────────────

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
