require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const swaggerUi  = require('swagger-ui-express');
const swaggerSpec = require('./swagger-spec');
const pool = require('./db');

const app = express();

// Swagger UI before helmet so CSP does not block inline scripts/styles
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'GEV ICMS API docs' }));
app.get('/swagger', (req, res) => {
  res.redirect(302, '/api-docs');
});

app.use(helmet());
app.use(cors());                 // permissive in dev — tighten origins in prod
app.use(express.json());

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/persons', require('./routes/persons'));
app.use('/api/gate',    require('./routes/gate'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'GEV ICMS', version: '1.0' });
});

app.get('/api/health/db', async (req, res) => {
  const started = Date.now();
  try {
    await pool.query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      database: 'connected',
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    console.error('Database health check failed', err);
    res.status(503).json({
      status: 'error',
      database: 'unavailable',
      message: err.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
const base = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`GEV ICMS API listening on ${HOST}:${PORT}`);
  console.log(`Swagger UI: ${base.replace(/\/$/, '')}/api-docs  (alias: /swagger)`);
});
