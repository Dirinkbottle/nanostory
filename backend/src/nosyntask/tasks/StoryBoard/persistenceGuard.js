const { queryOne } = require('../../../dbHelper');

function assertUpdated(result, label) {
  if (!result?.affectedRows) {
    throw new Error(`${label}写回失败：未更新任何记录`);
  }
}

async function assertPersistedFields({ table, id, fields, label }) {
  const fieldList = fields.join(', ');
  const row = await queryOne(`SELECT ${fieldList} FROM ${table} WHERE id = ?`, [id]);

  if (!row) {
    throw new Error(`${label}写回失败：记录不存在`);
  }

  for (const field of fields) {
    if (!row[field]) {
      throw new Error(`${label}写回校验失败：字段 ${field} 为空`);
    }
  }

  return row;
}

module.exports = {
  assertUpdated,
  assertPersistedFields
};
