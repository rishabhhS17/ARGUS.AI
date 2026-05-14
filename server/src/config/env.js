require('dotenv').config();

const env = {
  adminKey: process.env.ADMIN_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sentinel_db',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
};

module.exports = { env };
