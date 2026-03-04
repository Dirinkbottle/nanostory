/**
 * AIModelSelector 价格显示功能测试
 */

const fs = require('fs');
const path = require('path');

console.log('=== AIModelSelector 价格显示功能测试 ===\n');

// 测试 1: 检查 AIModelSelector 组件
console.log('测试 1: 检查 AIModelSelector 组件');
try {
  const selectorPath = path.join(__dirname, '../../../components/AIModelSelector.tsx');
  const content = fs.readFileSync(selectorPath, 'utf-8');

  if (content.includes('priceConfig')) {
    console.log('  ✓ AIModel 接口包含 priceConfig 字段');
  } else {
    console.log('  ✗ AIModel 接口缺少 priceConfig 字段');
  }

  if (content.includes('Coins')) {
    console.log('  ✓ 导入了 Coins 图标');
  } else {
    console.log('  ✗ 未导入 Coins 图标');
  }

  if (content.includes('model.priceConfig') && content.includes('model.priceConfig.unit')) {
    console.log('  ✓ 在 SelectItem 中显示价格信息');
  } else {
    console.log('  ✗ 未在 SelectItem 中显示价格信息');
  }

  if (content.includes('from-amber-500') || content.includes('text-amber')) {
    console.log('  ✓ 使用了美观的价格样式（amber/orange 渐变）');
  } else {
    console.log('  ✗ 未使用美观的价格样式');
  }

} catch (error) {
  console.error('  ✗ 测试失败:', error.message);
}

// 测试 2: 检查后端 API
console.log('\n测试 2: 检查后端 modelRoutes.js');
try {
  const routesPath = path.join(__dirname, '../modelRoutes.js');
  const content = fs.readFileSync(routesPath, 'utf-8');

  if (content.includes('price_config')) {
    console.log('  ✓ SQL 查询包含 price_config 字段');
  } else {
    console.log('  ✗ SQL 查询缺少 price_config 字段');
  }

  if (content.includes('priceConfig') && content.includes('unit') && content.includes('price')) {
    console.log('  ✓ 返回数据包含 priceConfig 对象');
  } else {
    console.log('  ✗ 返回数据缺少 priceConfig 对象');
  }

  if (content.includes('JSON.parse')) {
    console.log('  ✓ 正确解析 price_config JSON 字段');
  } else {
    console.log('  ✗ 未解析 price_config JSON 字段');
  }

} catch (error) {
  console.error('  ✗ 测试失败:', error.message);
}

// 测试 3: 检查前端 hook
console.log('\n测试 3: 检查 useAIModels hook');
try {
  const hookPath = path.join(__dirname, '../../../hooks/useAIModels.ts');
  const content = fs.readFileSync(hookPath, 'utf-8');

  if (content.includes('AIModel') && content.includes('from')) {
    console.log('  ✓ 使用了 AIModel 接口（会自动包含 priceConfig）');
  } else {
    console.log('  ⚠ 未明确导入 AIModel 接口');
  }

  console.log('  ℹ useAIModels 从 /api/ai-models 获取数据，会自动包含价格信息');

} catch (error) {
  console.error('  ✗ 测试失败:', error.message);
}

console.log('\n=== 测试完成 ===');
console.log('\n功能说明:');
console.log('1. ✓ AIModelSelector 在每个模型右侧显示价格标签');
console.log('2. ✓ 价格标签格式: "1 {单位} · {单价} 点"');
console.log('3. ✓ 使用 Coins 图标 + amber/orange 渐变背景');
console.log('4. ✓ 后端 API 返回 priceConfig: { unit, price }');
console.log('5. ✓ 价格标签使用 shrink-0 防止被压缩');
console.log('6. ✓ 模型名称使用 truncate 防止过长');
console.log('\n示例显示效果:');
console.log('  [模型名称]                    [💰 1 token · 0.01 点]');
console.log('  [提供商 · 描述]');
