/**
 * 前后端数据链路完整性检查脚本
 * 检查从前端到后端的完整数据流
 */

const fs = require('fs');
const path = require('path');

console.log('=== 前后端数据链路完整性检查 ===\n');

const issues = [];
const warnings = [];

// ===== 1. 检查登录鉴权一致性 =====
console.log('【1】检查登录鉴权一致性');
try {
  const authServicePath = path.join(__dirname, '../../../services/auth.ts');
  const authService = fs.readFileSync(authServicePath, 'utf-8');

  const adminLoginPath = path.join(__dirname, '../../../views/AdminLogin.tsx');
  const adminLogin = fs.readFileSync(adminLoginPath, 'utf-8');

  // 检查 AdminLogin 是否使用统一的 login 函数
  if (adminLogin.includes('import { login }') && adminLogin.includes('await login(')) {
    console.log('  ✓ AdminLogin 使用统一的 login 函数');
  } else {
    issues.push('AdminLogin 未使用统一的 login 函数，可能导致 localStorage 数据不一致');
  }

  // 检查 localStorage key 一致性
  const authTokenKeys = ['auth_token', 'AUTH_TOKEN_KEY'];
  const authUserKeys = ['auth_user', 'AUTH_USER_KEY'];

  if (authService.includes('AUTH_TOKEN_KEY') && authService.includes('AUTH_USER_KEY')) {
    console.log('  ✓ auth.ts 定义了统一的 localStorage key');
  }

  // 检查 AdminLayout 是否使用统一的 logout
  const adminLayoutPath = path.join(__dirname, '../../../views/admin/AdminLayout.tsx');
  const adminLayout = fs.readFileSync(adminLayoutPath, 'utf-8');

  if (adminLayout.includes('import { getAuthUser, logout }') && adminLayout.includes('logout()')) {
    console.log('  ✓ AdminLayout 使用统一的 logout 函数');
  } else {
    issues.push('AdminLayout 未使用统一的 logout 函数');
  }

} catch (error) {
  issues.push(`登录鉴权检查失败: ${error.message}`);
}

// ===== 2. 检查 AI 模型调用链路 =====
console.log('\n【2】检查 AI 模型调用链路');
try {
  const aiModelServicePath = path.join(__dirname, '../aiModelService.js');
  const aiModelService = fs.readFileSync(aiModelServicePath, 'utf-8');

  // 检查 customHandler 逻辑
  if (aiModelService.includes('if (model.custom_handler)') &&
      aiModelService.includes('getHandler(model.custom_handler)')) {
    console.log('  ✓ aiModelService 支持 customHandler');
  } else {
    issues.push('aiModelService 缺少 customHandler 支持');
  }

  // 检查参数渲染顺序
  if (aiModelService.includes('renderWithFallback')) {
    console.log('  ✓ 使用 renderWithFallback 进行参数渲染');
  }

  // 检查 customHandler 是否在渲染后执行
  const customHandlerIndex = aiModelService.indexOf('if (model.custom_handler)');
  const renderIndex = aiModelService.indexOf('renderWithFallback');

  if (customHandlerIndex > renderIndex) {
    console.log('  ✓ customHandler 在模板渲染之后执行');
  } else {
    warnings.push('customHandler 可能在模板渲染之前执行，会导致渲染错误');
  }

} catch (error) {
  issues.push(`AI 模型调用链路检查失败: ${error.message}`);
}

// ===== 3. 检查工作流参数传递 =====
console.log('\n【3】检查工作流参数传递');
try {
  const buildInputFactoryPath = path.join(__dirname, '../buildInputFactory.js');
  const buildInputFactory = fs.readFileSync(buildInputFactoryPath, 'utf-8');

  // 检查是否自动注入 userParams
  if (buildInputFactory.includes('input.userParams = context.userParams')) {
    console.log('  ✓ buildInputFactory 自动注入 userParams');
  } else {
    issues.push('buildInputFactory 未自动注入 userParams');
  }

  // 检查工作流任务是否正确使用 userParams
  const sceneVideoPath = path.join(__dirname, '../tasks/StoryBoard/sceneVideoGeneration.js');
  if (fs.existsSync(sceneVideoPath)) {
    const sceneVideo = fs.readFileSync(sceneVideoPath, 'utf-8');

    if (sceneVideo.includes('userParams') && sceneVideo.includes('mergeParameters')) {
      console.log('  ✓ sceneVideoGeneration 正确使用 userParams');
    } else {
      warnings.push('sceneVideoGeneration 可能未正确使用 userParams');
    }
  }

} catch (error) {
  issues.push(`工作流参数传递检查失败: ${error.message}`);
}

// ===== 4. 检查前端 API 调用 =====
console.log('\n【4】检查前端 API 调用');
try {
  // 检查前端是否统一使用 services
  const servicesPath = path.join(__dirname, '../../../services');
  if (fs.existsSync(servicesPath)) {
    const serviceFiles = fs.readdirSync(servicesPath).filter(f => f.endsWith('.ts'));
    console.log(`  ✓ 找到 ${serviceFiles.length} 个 service 文件:`, serviceFiles.join(', '));
  }

  // 检查是否有直接 fetch 调用（应该使用 services）
  const viewsPath = path.join(__dirname, '../../../views');
  let directFetchCount = 0;

  function checkDirectFetch(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        checkDirectFetch(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // 排除 services 目录
        if (!fullPath.includes('/services/') && content.includes('fetch(')) {
          directFetchCount++;
          warnings.push(`${fullPath.replace(process.cwd(), '')} 直接使用 fetch，建议使用 services`);
        }
      }
    }
  }

  if (fs.existsSync(viewsPath)) {
    checkDirectFetch(viewsPath);
    if (directFetchCount === 0) {
      console.log('  ✓ 所有视图组件都使用 services 而非直接 fetch');
    } else {
      console.log(`  ⚠ 发现 ${directFetchCount} 个组件直接使用 fetch`);
    }
  }

} catch (error) {
  issues.push(`前端 API 调用检查失败: ${error.message}`);
}

// ===== 5. 检查路由守卫 =====
console.log('\n【5】检查路由守卫');
try {
  const appPath = path.join(__dirname, '../../../App.tsx');
  const app = fs.readFileSync(appPath, 'utf-8');

  if (app.includes('ProtectedRoute') && app.includes('AdminRoute')) {
    console.log('  ✓ App.tsx 使用了 ProtectedRoute 和 AdminRoute');
  } else {
    issues.push('App.tsx 缺少路由守卫');
  }

  // 检查公开路由
  if (app.includes('path="/auth"') && app.includes('path="/admin/login"')) {
    console.log('  ✓ 公开路由配置正确');
  }

} catch (error) {
  issues.push(`路由守卫检查失败: ${error.message}`);
}

// ===== 输出结果 =====
console.log('\n' + '='.repeat(50));
console.log('检查结果汇总:\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ 所有检查通过，未发现问题！');
} else {
  if (issues.length > 0) {
    console.log(`❌ 发现 ${issues.length} 个严重问题:\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  发现 ${warnings.length} 个警告:\n`);
    warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }
}

console.log('\n' + '='.repeat(50));
