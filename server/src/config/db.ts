import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'kltrends';

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      connectTimeout: 5000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
};

/**
 * Execute a SQL query using the connection pool
 */
export const query = async <T = any>(sql: string, params?: any[]): Promise<T> => {
  const p = getPool();
  const timeout = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '8000', 10);
  const [results] = await p.query({ sql, timeout }, params);
  return results as T;
};

/**
 * Initialize MySQL tables if they do not exist
 */
const initTables = async (connection: mysql.Connection | mysql.Pool): Promise<void> => {
  // 1. Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NULL,
      fullName VARCHAR(255),
      employeeId VARCHAR(100) UNIQUE NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'employee', 'manager') DEFAULT 'employee',
      age INT NULL,
      phone VARCHAR(50) NULL,
      joiningDate VARCHAR(50) NULL,
      department VARCHAR(100) NULL,
      avatarUrl TEXT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_role (role),
      INDEX idx_user_email (email),
      INDEX idx_user_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Attendances table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS attendances (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      date VARCHAR(10) NOT NULL,
      checkInTime DATETIME NULL,
      checkOutTime DATETIME NULL,
      workDurationMinutes INT DEFAULT 0,
      status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') DEFAULT 'PRESENT',
      shiftStartTime VARCHAR(20) DEFAULT '10:00 AM',
      shiftEndTime VARCHAR(20) DEFAULT '05:30 PM',
      selfieUrl TEXT NULL,
      selfiePublicId VARCHAR(255) NULL,
      isVerified BOOLEAN DEFAULT FALSE,
      location VARCHAR(255) NULL,
      notes TEXT NULL,
      earlyCheckoutReason TEXT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_date (userId, date),
      INDEX idx_att_date (date),
      INDEX idx_att_status (status),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Run attendance column migrations when needed
  const [attCols]: any = await connection.query('SHOW COLUMNS FROM attendances');
  const existingAttCols = new Set(attCols.map((c: any) => c.Field));
  if (!existingAttCols.has('earlyCheckoutReason')) {
    await connection.query('ALTER TABLE attendances ADD COLUMN earlyCheckoutReason TEXT NULL');
  }

  // 3. Reports table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36) NOT NULL,
      date VARCHAR(10) NOT NULL,
      totalSalesAmount DOUBLE DEFAULT 0,
      whatsappEnquiries INT NOT NULL DEFAULT 0,
      totalOrders INT NOT NULL DEFAULT 0,
      completedOrders INT NOT NULL DEFAULT 0,
      cancelledOrders INT NOT NULL DEFAULT 0,
      codOrders INT NOT NULL DEFAULT 0,
      prepaidOrders INT NOT NULL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_report_user_date (userId, date),
      INDEX idx_rep_date (date),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Run report column migrations when needed
  const [cols]: any = await connection.query('SHOW COLUMNS FROM reports');
  const existingCols = new Set(cols.map((c: any) => c.Field));
  if (!existingCols.has('whatsappEnquiries')) {
    await connection.query('ALTER TABLE reports ADD COLUMN whatsappEnquiries INT NOT NULL DEFAULT 0');
  }
  if (!existingCols.has('totalOrders')) {
    await connection.query('ALTER TABLE reports ADD COLUMN totalOrders INT NOT NULL DEFAULT 0');
  }
  if (!existingCols.has('completedOrders')) {
    await connection.query('ALTER TABLE reports ADD COLUMN completedOrders INT NOT NULL DEFAULT 0');
  }
  if (!existingCols.has('cancelledOrders')) {
    await connection.query('ALTER TABLE reports ADD COLUMN cancelledOrders INT NOT NULL DEFAULT 0');
  }
  if (!existingCols.has('codOrders')) {
    await connection.query('ALTER TABLE reports ADD COLUMN codOrders INT NOT NULL DEFAULT 0');
  }
  if (!existingCols.has('prepaidOrders')) {
    await connection.query('ALTER TABLE reports ADD COLUMN prepaidOrders INT NOT NULL DEFAULT 0');
  }
  if (existingCols.has('products')) {
    await connection.query('ALTER TABLE reports DROP COLUMN products');
  }
  if (existingCols.has('notes')) {
    await connection.query('ALTER TABLE reports DROP COLUMN notes');
  }

  // 4. Notifications table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      senderId VARCHAR(36) NULL,
      senderName VARCHAR(255) NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('broadcast', 'announcement', 'direct', 'alert') DEFAULT 'broadcast',
      priority ENUM('normal', 'high', 'urgent') DEFAULT 'normal',
      targetType ENUM('all', 'department', 'employee') DEFAULT 'all',
      targetId VARCHAR(255) NULL,
      targetLabel VARCHAR(255) NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_notif_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Notification Reads table (tracks read status per user)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      id VARCHAR(36) PRIMARY KEY,
      notificationId VARCHAR(36) NOT NULL,
      userId VARCHAR(36) NOT NULL,
      readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_notif_user (notificationId, userId),
      FOREIGN KEY (notificationId) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Otps table (email verification & password reset)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'employee',
      registrationData JSON NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiresAt DATETIME NOT NULL,
      INDEX idx_otp_lookup (email, purpose, role),
      INDEX idx_otp_expires (expiresAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

};

/**
 * Connect to MySQL and initialize database tables
 */
export const connectDB = async (): Promise<void> => {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'kltrends';

  try {
    // 1. Ensure database exists
    const initialConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 5000,
    });

    await initialConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initialConn.end();

    // 2. Initialize connection pool
    const p = getPool();
    const testConn = await p.getConnection();
    console.log(`[Database] MySQL Connected successfully to \`${database}\` on ${host}:${port}`);

    // 3. Initialize tables
    await initTables(testConn);
    testConn.release();
    console.log(`[Database] MySQL Schema verified and tables ready.`);
  } catch (error: any) {
    console.error('[Database Error] MySQL connection failed:', error.message);
    throw error;
  }
};
