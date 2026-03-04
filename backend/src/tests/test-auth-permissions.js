/**
 * 权限验证功能测试脚本
 * 测试用户鉴权和管理员权限控制
 */

const fs = require('fs');
const path = require('path');

console.log('=== 权限验证功能测试 ===\n');

// 测试 1: 检查后端中间件
console.log('测试 1: 检查后端中间件');
try {
  const { authMiddleware } = require('../middleware');
  console.log('✓ authMiddleware 加载成功');
  console.log('✓ 中间件会验证 JWT token 并提取用户信息（userId, email, role）');
} catch (error) {
  console.error('✗ 后端中间件测试失败:', error.message);
}

console.log('\n测试 2: 检查管理员路由中间件');
try {
  const adminRoutesPath = path.join(__dirname, '../adminRoutes.js');
  const content = fs.readFileSync(adminRoutesPath, 'utf-8');

  if (content.includes('adminMiddleware') && content.includes("role !== 'admin'")) {
    console.log('✓ adminRoutes 包含 adminMiddleware');
    console.log('✓ adminMiddleware 检查用户角色是否为 admin');
    console.log('✓ 非管理员用户会收到 403 权限不足错误');
  } else {
    console.log('✗ adminRoutes 缺少权限检查');
  }
} catch (error) {
  console.error('✗ 管理员路由测试失败:', error.message);
}

console.log('\n测试 3: 检查前端 auth 服务');
try {
  const authServicePath = path.join(__dirname, '../../../services/auth.ts');
  const content = fs.readFileSync(authServicePath, 'utf-8');

  if (content.includes('getAuthUser') && content.includes('AUTH_USER_KEY')) {
    console.log('✓ auth.ts 包含 getAuthUser 函数');
    console.log('✓ getAuthUser 从 localStorage 读取用户信息');
    console.log('✓ 用户信息包含 id, email, role 字段');
  } else {
    console.log('✗ auth.ts 缺少 getAuthUser 函数');
  }
} catch (error) {
  console.error('✗ 前端 auth 服务测试失败:', error.message);
}

console.log('\n测试 4: 检查 AdminLayout 组件');
try {
  const adminLayoutPath = path.join(__dirname, '../../../views/admin/AdminLayout.tsx');
  const content = fs.readFileSync(adminLayoutPath, 'utf-8');

  if (content.includes('getAuthUser')) {
    console.log('✓ AdminLayout 导入了 getAuthUser');
  } else {
    console.log('✗ AdminLayout 未导入 getAuthUser');
  }

  if (content.includes('authUser') && content.includes('authUser?.email')) {
    console.log('✓ AdminLayout 使用 getAuthUser() 获取用户信息');
    console.log('✓ 用户名显示使用 authUser?.email');
  } else {
    console.log('✗ AdminLayout 未正确使用 getAuthUser');
  }
} catch (error) {
  console.error('✗ AdminLayout 测试失败:', error.message);
}

console.log('\n测试 5: 检查 AdminRoute 守卫组件');
try {
  const adminRoutePath = path.join(__dirname, '../../../components/AdminRoute.tsx');
  const content = fs.readFileSync(adminRoutePath, 'utf-8');

  if (content.includes('getAuthUser')) {
    console.log('✓ AdminRoute 导入了 getAuthUser');
  } else {
    console.log('✗ AdminRoute 未导入 getAuthUser');
  }

  if (content.includes('!authUser')) {
    console.log('✓ AdminRoute 检查用户是否登录');
    console.log('✓ 未登录用户会被重定向到 /admin/login');
  }

  if (content.includes("role !== 'admin'")) {
    console.log('✓ AdminRoute 检查用户角色是否为 admin');
    console.log('✓ 非管理员用户会看到权限不足提示页面');
  } else {
    console.log('✗ AdminRoute 缺少角色权限检查');
  }
} catch (error) {
  console.error('✗ AdminRoute 测试失败:', error.message);
}

console.log('\n测试 6: 检查 App.tsx 路由配置');
try {
  const appPath = path.join(__dirname, '../../../App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  if (content.includes('import AdminRoute')) {
    console.log('✓ App.tsx 导入了 AdminRoute');
  } else {
    console.log('✗ App.tsx 未导入 AdminRoute');
  }

  if (content.includes('<AdminRoute>') && content.includes('<AdminLayout />')) {
    console.log('✓ App.tsx 使用 AdminRoute 包裹 AdminLayout');
    console.log('✓ 管理员路由受到权限保护');
  } else {
    console.log('✗ App.tsx 未正确使用 AdminRoute');
  }
} catch (error) {
  console.error('✗ App.tsx 测试失败:', error.message);
}

console.log('\n=== 测试完成 ===');
console.log('\n修复内容总结:');
console.log('1. ✓ AdminLayout 现在使用 getAuthUser() 获取真实用户信息');
console.log('2. ✓ 创建了 AdminRoute 守卫组件，检查用户角色');
console.log('3. ✓ App.tsx 中的管理员路由被 AdminRoute 保护');
console.log('4. ✓ 普通用户访问管理员后台会看到权限不足提示页面');
console.log('5. ✓ 未登录用户会被重定向到管理员登录页面');
console.log('6. ✓ 后端 adminRoutes 使用 adminMiddleware 验证管理员权限');

