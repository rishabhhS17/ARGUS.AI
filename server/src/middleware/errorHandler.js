const { env } = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const publicMessage = err.publicMessage || err.message || 'Internal Server Error';

  console.error(err);

  res.status(statusCode).json({
    error: publicMessage,
    ...(env.nodeEnv !== 'production' ? { details: err.message } : {}),
  });
}

module.exports = { errorHandler, notFoundHandler };
