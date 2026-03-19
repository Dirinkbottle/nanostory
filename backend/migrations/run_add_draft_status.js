/**
 * 运行数据库迁移脚本
 * 添加 draft 状态支持
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  try {
    console.log('开始执行迁移...');

    // 1. 修改 status 列的 ENUM 类型
    console.log('1. 修改 status 列 ENUM 类型...');
    await connection.execute(`
      ALTER TABLE scripts 
      MODIFY COLUMN status ENUM('draft', 'generating', 'completed', 'failed') DEFAULT 'completed' 
      COMMENT '生成状态：draft=草稿, generating=生成中, completed=已完成, failed=失败'
    `);

    // 2. 添加 draft_description 列
    console.log('2. 添加 draft_description 列...');
    try {
      await connection.execute(`
        ALTER TABLE scripts 
        ADD COLUMN draft_description TEXT NULL COMMENT '草稿描述（故事走向）' AFTER content
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   draft_description 列已存在，跳过');
      } else {
        throw err;
      }
    }

    // 3. 添加 draft_length 列
    console.log('3. 添加 draft_length 列...');
    try {
      await connection.execute(`
        ALTER TABLE scripts 
        ADD COLUMN draft_length VARCHAR(20) NULL COMMENT '草稿长度（短篇/中篇/长篇）' AFTER draft_description
      `);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   draft_length 列已存在，跳过');
      } else {
        throw err;
      }
    }

    console.log('迁移完成!');
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
