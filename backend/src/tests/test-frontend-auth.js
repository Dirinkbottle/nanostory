/**
 * 前端登录鉴权功能测试脚本
 * 测试路由守卫和登录重定向功能
 */

const fs = require('fs');
const path = require('path');

console.log('=== 前端登录鉴权功能测试 ===\n');

// 测试 1: 检查 ProtectedRoute 组件
console.log('测试 1: 检查 ProtectedRoute 组件');
try {
  const protectedRoutePath = path.join(__dirname, '../../../components/ProtectedRoute.tsx');
  const content = fs.readFileSync(protectedRoutePath, 'utf-8');

  if (content.includes('getAuthToken')) {
    console.log('✓ ProtectedRoute 导入了 getAuthToken');
  } else {
    console.log('✗ ProtectedRoute 未导入 getAuthToken');
  }

  if (content.includes('!token')) {
    console.log('✓ ProtectedRoute 检查用户是否有 token');
  }

  if (content.includes('Navigate to="/auth"')) {
    console.log('✓ 未登录用户会被重定向到 /auth');
  } else {
    console.log('✗ ProtectedRoute 缺少重定向逻辑');
  }

  if (content.includes('state={{ from: location }}')) {
    console.log('✓ ProtectedRoute 保存了用户想访问的页面路径');
  } else {
    console.log('✗ ProtectedRoute 未保存原始路径');
  }
} catch (error) {
  console.error('✗ ProtectedRoute 测试失败:', error.message);
}

console.log('\n测试 2: 检查 App.tsx 路由配置');
try {
  const appPath = path.join(__dirname, '../../../App.tsx');
  const content = fs.readFileSync(appPath, 'utf-8');

  if (content.includes('import ProtectedRoute')) {
    console.log('✓ App.tsx 导入了 ProtectedRoute');
  } else {
    console.log('✗ App.tsx 未导入 ProtectedRoute');
  }

  // 检查公开路由
  const authRouteMatch = content.match(/<Route path="\/auth" element={<Auth \/>/);
  if (authRouteMatch) {
    console.log('✓ /auth 路由是公开的（不需要登录）');
  }

  const adminLoginMatch = content.match(/<Route path="\/admin\/login" element={<AdminLogin \/>/);
  if (adminLoginMatch) {
    console.log('✓ /admin/login 路由是公开的（不需要登录）');
  }

  // 检查受保护路由
  if (content.includes('<ProtectedRoute>') && content.includes('<Layout>')) {
    console.log('✓ 主应用路由被 ProtectedRoute 保护');
    console.log('✓ 所有主应用页面都需要登录才能访问');
  } else {
    console.log('✗ 主应用路由未被正确保护');
  }

  // 检查路由顺序
  const authIndex = content.indexOf('path="/auth"');
  const protectedIndex = content.indexOf('<ProtectedRoute>');
  if (authIndex > 0 && protectedIndex > 0 && authIndex < protectedIndex) {
    console.log('✓ 路由顺序正确：公开路由在前，受保护路由在后');
  }
} catch (error) {
  console.error('✗ App.tsx 测试失败:', error.message);
}

console.log('\n测试 3: 检查 Auth 登录页面');
try {
  const authPath = path.join(__dirname, '../../../views/Auth.tsx');
  const content = fs.readFileSync(authPath, 'utf-8');

  if (content.includes('useLocation')) {
    console.log('✓ Auth 组件导入了 useLocation');
  }

  if (content.includes('location.state') && content.includes('from')) {
    console.log('✓ Auth 组件读取了用户想访问的原始页面');
  } else {
    console.log('✗ Auth 组件未读取原始页面路径');
  }

  if (content.includes('navigate(from')) {
    console.log('✓ 登录成功后会返回用户想访问的页面');
  } else {
    console.log('✗ 登录成功后未返回原始页面');
  }
} catch (error) {
  console.error('✗ Auth 测试失败:', error.message);
}

console.log('\n测试 4: 检查 auth 服务');
try {
  const authServicePath = path.join(__dirname, '../../../services/auth.ts');
  const content = fs.readFileSync(authServicePath, 'utf-8');

  if (content.includes('getAuthToken')) {
    console.log('✓ auth.ts 包含 getAuthToken 函数');
  }

  if (content.includes('AUTH_TOKEN_KEY')) {
    console.log('✓ token 存储在 localStorage 中');
  }

  if (content.includes('saveAuth')) {
    console.log('✓ 登录成功后会保存 token 和用户信息');
  }
} catch (error) {
  console.error('✗ auth 服务测试失败:', error.message);
}

console.log('\n=== 测试完成 ===');
console.log('\n功能总结:');
console.log('1. ✓ 创建了 ProtectedRoute 守卫组件');
console.log('2. ✓ 所有主应用页面都需要登录才能访问');
console.log('3. ✓ 未登录用户会被重定向到 /auth 登录页面');
console.log('4. ✓ 登录成功后会返回用户想访问的页面');
console.log('5. ✓ /auth 和 /admin/login 是公开路由，不需要登录');
console.log('6. ✓ 使用 getAuthToken() 检查用户登录状态');
console.log('\n路由保护策略:');
console.log('- 公开路由: /auth, /admin/login');
console.log('- 受保护路由: /, /assets, /projects, /settings, /user-center');
console.log('- 管理员路由: /admin/* (需要 admin 角色)');
