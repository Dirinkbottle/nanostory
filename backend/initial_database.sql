-- nanostory 项目 MySQL 初始化脚本
-- 幂等设计：使用 CREATE DATABASE IF NOT EXISTS + CREATE TABLE IF NOT EXISTS
-- 可重复执行，不会破坏已有数据

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS nanostory 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE nanostory;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user' COMMENT '用户角色：user=普通用户, admin=管理员',
  balance DECIMAL(10,2) DEFAULT 100.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 剧本表
CREATE TABLE IF NOT EXISTS scripts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  model_provider VARCHAR(100),
  token_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分镜表
CREATE TABLE IF NOT EXISTS storyboards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  script_id INT NOT NULL,
  idx INT NOT NULL,
  prompt_template TEXT,
  variables_json TEXT,
  image_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
  INDEX idx_script_id (script_id),
  INDEX idx_idx (idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 计费记录表
CREATE TABLE IF NOT EXISTS billing_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  script_id INT,
  operation VARCHAR(50) NOT NULL,
  model_provider VARCHAR(100),
  model_tier VARCHAR(50),
  tokens INT NOT NULL,
  unit_price DECIMAL(10,4) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_operation (operation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 模型配置表 (统一管理所有第三方 AI 接口)
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基础信息
  name VARCHAR(255) NOT NULL COMMENT '模型显示名称，如 "Sora 2.0 Turbo"',
  category ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO') NOT NULL COMMENT '模型分类',
  provider VARCHAR(100) NOT NULL COMMENT '厂商标识，如 openai, google, kling, minimax',
  description TEXT COMMENT '模型描述',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用，0=禁用 1=启用',
  api_key VARCHAR(500) COMMENT 'API 密钥，优先使用此字段，为空则从环境变量获取',
  
  -- 价格配置 (JSON 格式)
  -- 示例: {"unit": "second", "price": 0.05} 或 {"unit": "token", "price": 0.0001}
  price_config JSON NOT NULL COMMENT '价格配置，包含计费单位和单价',
  
  -- 请求配置
  request_method ENUM('GET', 'POST', 'PUT', 'DELETE') DEFAULT 'POST' COMMENT 'HTTP 请求方法',
  url_template VARCHAR(500) NOT NULL COMMENT 'API 地址模板，支持占位符如 https://api.kling.com/v1/{{action}}',
  
  -- Headers 模板 (JSON 格式)
  -- 示例: {"Authorization": "Bearer {{apiKey}}", "Content-Type": "application/json"}
  headers_template JSON NOT NULL COMMENT 'HTTP Headers 模板，支持 {{apiKey}} 等占位符',
  
  -- Body 模板 (JSON 格式)
  -- 示例: {"model": "kling-v1", "prompt": "{{prompt}}", "image_url": "{{imageUrl}}"}
  body_template JSON COMMENT 'HTTP Body 模板，支持 {{prompt}}, {{width}} 等占位符',
  
  -- 默认参数 (JSON 格式)
  -- 示例: {"aspect_ratio": "16:9", "duration": 5}
  default_params JSON COMMENT '默认参数，前端未传时使用',
  
  -- 响应映射 (JSON 格式)
  -- 示例: {"taskId": "data.id", "status": "data.status", "videoUrl": "data.result.video_url"}
  response_mapping JSON NOT NULL COMMENT '响应字段映射，用于统一不同厂商的返回格式',
  
  -- 查询配置 (用于轮询任务状态)
  query_url_template VARCHAR(500) COMMENT '查询任务状态的 URL 模板',
  query_method ENUM('GET', 'POST') DEFAULT 'GET' COMMENT '查询请求方法',
  query_headers_template JSON COMMENT '查询请求的 Headers 模板',
  query_body_template JSON COMMENT '查询请求的 Body 模板',
  query_response_mapping JSON COMMENT '查询响应的字段映射',
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_category (category),
  INDEX idx_provider (provider),
  INDEX idx_is_active (is_active),
  INDEX idx_category_active (category, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 模型配置表';

-- 系统配置表 (存储全局 API Key 等敏感信息)
CREATE TABLE IF NOT EXISTS system_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键，如 openai_api_key, kling_api_key',
  config_value TEXT NOT NULL COMMENT '配置值',
  description VARCHAR(500) COMMENT '配置描述',
  is_encrypted TINYINT(1) DEFAULT 0 COMMENT '是否加密存储',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  appearance TEXT,
  personality TEXT,
  image_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 场景表
CREATE TABLE IF NOT EXISTS scenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  environment TEXT,
  lighting TEXT,
  mood TEXT,
  image_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 剧本素材表
CREATE TABLE IF NOT EXISTS script_assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  genre VARCHAR(100),
  duration VARCHAR(100),
  image_url TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_name (name),
  INDEX idx_genre (genre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  type VARCHAR(50) DEFAULT 'comic',
  status VARCHAR(50) DEFAULT 'draft',
  settings_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化默认管理员账户
-- 账号: admin, 密码: 123 (使用 bcrypt 加密，cost=10)
INSERT INTO users (email, password_hash, role, balance) 
VALUES ('admin', '$2a$10$Np.BhyKQQ3Tj56Ls1NE3Xu3ChejTyovBjvlNuOkdmori5CyCCWiSq', 'admin', 999999.00)
ON DUPLICATE KEY UPDATE email=email;

-- 初始化 DeepSeek 模型配置
-- 注意：api_key 字段需要手动在数据库中更新，或通过管理后台配置
INSERT INTO ai_model_configs (
  name, category, provider, description, is_active, api_key,
  price_config, request_method, url_template, headers_template,
  body_template, default_params, response_mapping
) VALUES (
  'DeepSeek Chat',
  'TEXT',
  'deepseek',
  '高性价比AI文本生成，适合剧本创作和智能对话',
  1,
  NULL,  -- API Key 留空，首次使用时需在管理后台配置
  '{"unit": "token", "price": 0.0000014}',
  'POST',
  'https://api.deepseek.com/v1/chat/completions',
  '{"Content-Type": "application/json", "Authorization": "Bearer {{apiKey}}"}',
  '{"model": "deepseek-chat", "messages": "{{messages}}", "max_tokens": "{{maxTokens}}", "temperature": "{{temperature}}"}',
  '{"maxTokens": 8000, "temperature": 0.7}',
  '{"content": "choices.0.message.content", "tokens": "usage.total_tokens", "finishReason": "choices.0.finish_reason"}'
)
ON DUPLICATE KEY UPDATE 
  category=VALUES(category),
  provider=VALUES(provider),
  description=VALUES(description),
  api_key=VALUES(api_key);

SET FOREIGN_KEY_CHECKS = 1;