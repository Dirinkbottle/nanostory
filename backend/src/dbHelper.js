const { getPool } = require('./db');

async function execute(sql, params = []) {
  const pool = getPool();
  const [result] = await pool.query(sql, params);
  return result;
}

async function queryOne(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

async function queryAll(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.query(sql, params);
  return rows || [];
}

async function getLastInsertId() {
  const pool = getPool();
  const [result] = await pool.query('SELECT LAST_INSERT_ID() as id');
  return result && result.length > 0 ? result[0].id : null;
}

module.exports = {
  execute,
  queryOne,
  queryAll,
  getLastInsertId
};