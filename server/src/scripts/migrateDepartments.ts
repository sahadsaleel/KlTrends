import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const VALID_DEPARTMENTS = ['sales', 'manager', 'packaging', 'media'] as const;

async function migrate() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'kltrends';

  console.log(`Connecting to MySQL database \`${database}\` at ${host}:${port}...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    console.log('\n--- Step 1: Reviewing Existing Employees and Departments ---');
    const [existingRows] = await conn.query<any[]>(
      `SELECT id, fullName, email, department, role FROM users`
    );

    console.log(`Found ${existingRows.length} total users.`);
    for (const u of existingRows) {
      console.log(`- [${u.role}] ${u.fullName || u.email} (ID: ${u.id}) -> Current Dept: "${u.department}"`);
    }

    console.log('\n--- Step 2: Updating Old Department Values ---');

    // 1. Sales
    const [resSales] = await conn.query<any>(`
      UPDATE users
      SET department = 'sales'
      WHERE department IS NULL
         OR department = ''
         OR LOWER(department) IN ('sales', 'sales & marketing', 'general', 'engineering & development', 'human resources', 'finance & accounting', 'customer support')
         OR LOWER(department) LIKE '%sale%'
    `);
    console.log(`Updated to 'sales': ${resSales.affectedRows || 0} rows`);

    // 2. Manager
    const [resMgr] = await conn.query<any>(`
      UPDATE users
      SET department = 'manager'
      WHERE LOWER(department) IN ('manager', 'management')
         OR LOWER(department) LIKE '%manag%'
    `);
    console.log(`Updated to 'manager': ${resMgr.affectedRows || 0} rows`);

    // 3. Packaging
    const [resPkg] = await conn.query<any>(`
      UPDATE users
      SET department = 'packaging'
      WHERE LOWER(department) IN ('packaging', 'operations & logistics', 'operations', 'logistics')
         OR LOWER(department) LIKE '%pack%'
         OR LOWER(department) LIKE '%logist%'
    `);
    console.log(`Updated to 'packaging': ${resPkg.affectedRows || 0} rows`);

    // 4. Media
    const [resMedia] = await conn.query<any>(`
      UPDATE users
      SET department = 'media'
      WHERE LOWER(department) IN ('media', 'product design', 'design', 'content', 'marketing')
         OR LOWER(department) LIKE '%media%'
    `);
    console.log(`Updated to 'media': ${resMedia.affectedRows || 0} rows`);

    // 5. Catch-all for any other unmapped departments
    const [resCatchAll] = await conn.query<any>(`
      UPDATE users
      SET department = 'sales'
      WHERE department NOT IN ('sales', 'manager', 'packaging', 'media')
    `);
    console.log(`Catch-all updated to 'sales': ${resCatchAll.affectedRows || 0} rows`);

    console.log('\n--- Step 3: Enforcing Column Constraint on Database ---');
    await conn.query(`
      ALTER TABLE users MODIFY COLUMN department ENUM('sales', 'manager', 'packaging', 'media') NOT NULL DEFAULT 'sales'
    `);
    console.log('Altered users.department column to ENUM("sales", "manager", "packaging", "media") NOT NULL DEFAULT "sales".');

    // Index
    const [idxRows] = await conn.query<any[]>(
      `SHOW INDEX FROM users WHERE Key_name = 'idx_user_department'`
    );
    if (!idxRows || idxRows.length === 0) {
      await conn.query(`ALTER TABLE users ADD INDEX idx_user_department (department)`);
      console.log('Added index idx_user_department.');
    }

    console.log('\n--- Step 4: Verification of Updated Records ---');
    const [updatedRows] = await conn.query<any[]>(
      `SELECT id, fullName, email, department, role FROM users`
    );
    for (const u of updatedRows) {
      console.log(`✓ [${u.role}] ${u.fullName} (${u.email}) -> Department: "${u.department}"`);
    }

    console.log('\nDepartment migration completed successfully!');
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
