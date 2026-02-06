const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

async function initializeDatabase() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'nanostory';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: 'Z'
  });

  await pool.query('SELECT 1');

  console.log('[DB] MySQL pool initialized successfully');
  return pool;
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initializeDatabase,
  getPool,
  closeDatabase
};