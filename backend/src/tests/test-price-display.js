/**
 * 测试价格显示功能的完整数据流
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');

console.log('=== 测试价格显示数据流 ===\n');

// 1. 检查数据库中的price_config
console.log('1. 检查数据库中的price_config字段：');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, name, price_config FROM ai_model_configs WHERE is_active = 1 LIMIT 5', [], (err, rows) => {
  if (err) {
    console.error('❌ 数据库查询失败:', err);
    return;
  }

  console.log(`找到 ${rows.length} 个活跃模型：\n`);
  rows.forEach(row => {
    console.log(`模型: ${row.name}`);
    console.log(`  price_config (原始): ${row.price_config}`);

    if (row.price_config) {
      try {
        const parsed = JSON.parse(row.price_config);
        console.log(`  price_config (解析后):`, parsed);
      } catch (e) {
        console.log(`  ❌ JSON解析失败: ${e.message}`);
      }
    } else {
      console.log(`  ⚠️  price_config 为空`);
    }
    console.log('');
  });

  // 2. 测试API响应格式
  console.log('\n2. 模拟API响应格式：');
  const mockApiResponse = rows.map(m => {
    let priceConfig = null;
    if (m.price_config) {
      try {
        const parsed = typeof m.price_config === 'string'
          ? JSON.parse(m.price_config)
          : m.price_config;
        priceConfig = {
          unit: parsed.unit || 'token',
          price: parsed.price || 0
        };
      } catch (err) {
        console.warn(`解析 price_config 失败 (${m.name}):`, err.message);
      }
    }
    return {
      id: m.id,
      name: m.name,
      priceConfig
    };
  });

  console.log(JSON.stringify(mockApiResponse, null, 2));

  // 3. 检查是否有模型缺少price_config
  console.log('\n3. 统计分析：');
  const totalModels = rows.length;
  const modelsWithPrice = rows.filter(r => r.price_config).length;
  const modelsWithoutPrice = totalModels - modelsWithPrice;

  console.log(`总模型数: ${totalModels}`);
  console.log(`有价格配置: ${modelsWithPrice}`);
  console.log(`无价格配置: ${modelsWithoutPrice}`);

  if (modelsWithoutPrice > 0) {
    console.log('\n⚠️  警告：有模型缺少price_config，这些模型不会显示价格！');
    console.log('缺少price_config的模型：');
    rows.filter(r => !r.price_config).forEach(r => {
      console.log(`  - ${r.name} (id: ${r.id})`);
    });
  }

  db.close();
});
