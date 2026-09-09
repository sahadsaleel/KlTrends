import 'dotenv/config';

import app from './app.js';
import { connectDB } from './config/db.js';
import { assertJwtConfiguration } from './utils/jwt.js';
import { ensureConfiguredAdmin } from './services/adminAccountService.js';

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    assertJwtConfiguration();
    // Connect to MySQL
    await connectDB();
    await ensureConfiguredAdmin();

    // Start Express server only after MySQL connection succeeds
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'
        } mode`
      );
    });
  } catch (error) {
    console.error('[Server Error] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
