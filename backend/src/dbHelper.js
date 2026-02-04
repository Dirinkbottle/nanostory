const { getDb, saveDatabase } = require('./db');

function execute(sql, params = []) {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');
  
  db.run(sql, params);
  saveDatabase();
}

function queryOne(sql, params = []) {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  
  stmt.free();
  return null;
}

function queryAll(sql, params = []) {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(sql);
  stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  
  stmt.free();
  return results;
}

function getLastInsertId() {
  const db = getDb();
  if (!db) throw new Error('Database not initialized');
  
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    return result[0].values[0][0];
  }
  return null;
}

module.exports = {
  execute,
  queryOne,
  queryAll,
  getLastInsertId
};
