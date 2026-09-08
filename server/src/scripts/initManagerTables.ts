import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

async function initManagerTables() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'kltrends';

  console.log(`Connecting to MySQL database \`${database}\` at ${host}:${port}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    console.log('Creating product_returns table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_returns (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        employeeId VARCHAR(100) NULL,
        employeeName VARCHAR(255) NULL,
        department VARCHAR(50) NOT NULL DEFAULT 'manager',
        date VARCHAR(10) NOT NULL,
        orderSource ENUM('kltrends', 'klindia') NOT NULL,
        returnQuantity INT NOT NULL,
        notes TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pr_date (date),
        INDEX idx_pr_source (orderSource),
        INDEX idx_pr_user (userId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('product_returns table ready.');

    console.log('Creating daily_expenses table if not exists...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_expenses (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        employeeId VARCHAR(100) NULL,
        employeeName VARCHAR(255) NULL,
        department VARCHAR(50) NOT NULL DEFAULT 'manager',
        date VARCHAR(10) NOT NULL,
        category VARCHAR(100) NOT NULL,
        customCategoryName VARCHAR(255) NULL,
        amount DOUBLE NOT NULL,
        description TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_de_date (date),
        INDEX idx_de_category (category),
        INDEX idx_de_user (userId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('daily_expenses table ready.');

    // Check tables in DB
    const [tables]: any = await conn.query('SHOW TABLES');
    console.log('Tables in database:', tables.map((t: any) => Object.values(t)[0]));
  } catch (err) {
    console.error('Database setup error:', err);
  } finally {
    await conn.end();
  }
}

initManagerTables();
