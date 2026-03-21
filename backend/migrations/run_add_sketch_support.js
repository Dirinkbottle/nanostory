/**
 * 运行数据库迁移脚本
 * 添加分镜草图支持字段
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
    console.log('开始执行草图支持迁移...');

    // 1. 添加 storyboards.sketch_url 列
    console.log('1. 添加 storyboards.sketch_url 列...');
    try {
      await connection.execute(`
        ALTER TABLE storyboards 
        ADD COLUMN sketch_url TEXT DEFAULT NULL COMMENT '草图URL'
      `);
      console.log('   sketch_url 列添加成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   sketch_url 列已存在，跳过');
      } else {
        throw err;
      }
    }

    // 2. 添加 storyboards.sketch_type 列
    console.log('2. 添加 storyboards.sketch_type 列...');
    try {
      await connection.execute(`
        ALTER TABLE storyboards 
        ADD COLUMN sketch_type VARCHAR(32) DEFAULT NULL COMMENT '草图类型：stick_figure=火柴人, storyboard_sketch=分镜草图, detailed_lineart=精细线稿'
      `);
      console.log('   sketch_type 列添加成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   sketch_type 列已存在，跳过');
      } else {
        throw err;
      }
    }

    // 3. 添加 storyboards.sketch_data 列
    console.log('3. 添加 storyboards.sketch_data 列...');
    try {
      await connection.execute(`
        ALTER TABLE storyboards 
        ADD COLUMN sketch_data JSON DEFAULT NULL COMMENT '草图相关数据（JSON格式）'
      `);
      console.log('   sketch_data 列添加成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   sketch_data 列已存在，跳过');
      } else {
        throw err;
      }
    }

    // 4. 添加 storyboards.control_strength 列
    console.log('4. 添加 storyboards.control_strength 列...');
    try {
      await connection.execute(`
        ALTER TABLE storyboards 
        ADD COLUMN control_strength DECIMAL(3,2) DEFAULT 0.85 COMMENT 'ControlNet 控制强度（0.00-1.00）'
      `);
      console.log('   control_strength 列添加成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   control_strength 列已存在，跳过');
      } else {
        throw err;
      }
    }

    // 5. 添加 scenes.sketch_url 列
    console.log('5. 添加 scenes.sketch_url 列...');
    try {
      await connection.execute(`
        ALTER TABLE scenes 
        ADD COLUMN sketch_url TEXT DEFAULT NULL COMMENT '场景草图URL'
      `);
      console.log('   scenes.sketch_url 列添加成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   scenes.sketch_url 列已存在，跳过');
      } else {
        throw err;
      }
    }

    console.log('草图支持迁移完成!');
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
