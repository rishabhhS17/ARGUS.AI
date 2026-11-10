const cors = require('cors');
const express = require('express');

const { env } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// Behind Render's load balancer req.ip would otherwise be the proxy's address, and every
// user would share one rate-limit bucket.
app.set('trust proxy', env.trustProxyHops);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api', apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
