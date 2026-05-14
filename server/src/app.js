const cors = require('cors');
const express = require('express');

const { apiLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

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
