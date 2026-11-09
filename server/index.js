const { app } = require('./src/app');
const { connectDatabase } = require('./src/config/db');
const { env } = require('./src/config/env');

connectDatabase();

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
