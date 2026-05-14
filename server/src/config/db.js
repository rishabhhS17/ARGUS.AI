const mongoose = require('mongoose');

const { env } = require('./env');

async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
}

module.exports = { connectDatabase };
