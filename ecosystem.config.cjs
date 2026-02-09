/**
 * PM2 进程管理配置
 * 一键启动前端 + 后端
 *
 * 使用方式：
 *   pm2 start ecosystem.config.cjs        # 启动所有服务
 *   pm2 stop ecosystem.config.cjs         # 停止所有服务
 *   pm2 restart ecosystem.config.cjs      # 重启所有服务
 *   pm2 delete ecosystem.config.cjs       # 删除所有服务
 *   pm2 logs                              # 查看所有日志
 *   pm2 logs nanostory-backend            # 查看后端日志
 *   pm2 logs nanostory-frontend           # 查看前端日志
 *   pm2 status                            # 查看服务状态
 */

module.exports = {
  apps: [
    {
      name: 'nanostory-backend',
      cwd: './backend',
      script: 'src/index.js',
      interpreter: 'node',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      // 自动重启配置
      max_restarts: 10,
      restart_delay: 3000,
      // 日志配置
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'nanostory-frontend',
      cwd: './',
      script: 'npx',
      args: 'vite --host',
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'development'
      },
      // 前端 dev server 不需要自动重启
      autorestart: false,
      // 日志配置
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
