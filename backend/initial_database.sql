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

-- 项目表（提前创建，因为其他表需要引用）
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  type VARCHAR(50) DEFAULT 'video' COMMENT '项目类型：video=视频, comic=漫画',
  status VARCHAR(50) DEFAULT 'draft' COMMENT '状态：draft=草稿, in_progress=进行中, completed=已完成',
  settings_json TEXT COMMENT '项目配置（JSON格式）',
  use_models JSON DEFAULT NULL COMMENT 'AI模型选择配置（按category分类，如 {"TEXT":"模型名","IMAGE":"模型名","VIDEO":"模型名"}）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 剧本表
CREATE TABLE IF NOT EXISTS scripts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL COMMENT '所属项目ID',
  episode_number INT NOT NULL DEFAULT 1 COMMENT '集数编号，从1开始',
  title VARCHAR(255),
  content TEXT NOT NULL,
  model_provider VARCHAR(100),
  token_used INT DEFAULT 0,
  status ENUM('generating', 'completed', 'failed') DEFAULT 'completed' COMMENT '生成状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY uk_project_episode (project_id, episode_number) COMMENT '每个项目的每集只能有一个剧本',
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_episode_number (episode_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分镜表
CREATE TABLE IF NOT EXISTS storyboards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL COMMENT '所属项目ID',
  script_id INT NOT NULL,
  idx INT NOT NULL COMMENT '分镜序号',
  prompt_template TEXT COMMENT '提示词模板',
  variables_json TEXT COMMENT '变量（JSON格式）',
  first_frame_url TEXT COMMENT '首帧图片URL',
  last_frame_url TEXT COMMENT '尾帧图片URL',
  video_url TEXT COMMENT '生成的视频URL',
  updated_scene_url TEXT DEFAULT NULL COMMENT '更新版空镜场景图URL（modified镜头生成，供后续 inherit 镜头作为场景参考）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
  INDEX idx_project_id (project_id),
  INDEX idx_script_id (script_id),
  INDEX idx_idx (idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL COMMENT '所属项目ID',
  script_id INT DEFAULT NULL COMMENT '来源剧本ID（如果是从剧本提取）',
  name VARCHAR(255) NOT NULL,
  description TEXT COMMENT '角色描述',
  appearance TEXT COMMENT '外貌特征',
  personality TEXT COMMENT '性格特点',
  image_url TEXT COMMENT '角色图片URL',
  front_view_url TEXT COMMENT '正面视图URL',
  side_view_url TEXT COMMENT '侧面视图URL',
  back_view_url TEXT COMMENT '背面视图URL',
  tags TEXT COMMENT '标签（逗号分隔）',
  source VARCHAR(50) DEFAULT 'manual' COMMENT '来源：manual=手动创建, ai_extracted=AI从剧本提取, ai_generated=AI生成',
  generation_prompt TEXT COMMENT '图片生成提示词',
  generation_params JSON COMMENT '图片生成参数（模型、尺寸、风格等）',
  generation_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT NULL COMMENT '图片生成状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_script_id (script_id),
  INDEX idx_name (name),
  INDEX idx_source (source),
  INDEX idx_generation_status (generation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 场景表
CREATE TABLE IF NOT EXISTS scenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL COMMENT '所属项目ID',
  script_id INT DEFAULT NULL COMMENT '来源剧本ID（如果是从剧本提取）',
  name VARCHAR(255) NOT NULL,
  description TEXT COMMENT '场景描述',
  environment TEXT COMMENT '环境描述',
  lighting TEXT COMMENT '光照描述',
  mood TEXT COMMENT '氛围描述',
  image_url TEXT COMMENT '场景图片URL（A面/正打：主视角空镜）',
  reverse_image_url TEXT COMMENT '场景图片URL（B面/反打：180°反向视角空镜）',
  tags TEXT COMMENT '标签（逗号分隔）',
  source VARCHAR(50) DEFAULT 'manual' COMMENT '来源：manual=手动创建, ai_extracted=AI从剧本提取, ai_generated=AI生成',
  generation_prompt TEXT COMMENT '图片生成提示词（A面）',
  reverse_generation_prompt TEXT COMMENT '图片生成提示词（B面）',
  generation_params JSON COMMENT '图片生成参数',
  generation_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT NULL COMMENT '图片生成状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_script_id (script_id),
  INDEX idx_name (name),
  INDEX idx_source (source),
  INDEX idx_generation_status (generation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 道具表
CREATE TABLE IF NOT EXISTS props (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL COMMENT '所属项目ID',
  name VARCHAR(255) NOT NULL COMMENT '道具名称',
  description TEXT COMMENT '道具描述',
  category VARCHAR(100) COMMENT '道具分类，如：武器、工具、装饰品等',
  image_url TEXT COMMENT '道具图片URL',
  tags TEXT COMMENT '标签，逗号分隔',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_name (name),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分镜-角色 关联表（强ID关联，替代 variables_json 中的名字字符串）
CREATE TABLE IF NOT EXISTS storyboard_characters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storyboard_id INT NOT NULL COMMENT '分镜ID',
  character_id INT NOT NULL COMMENT '角色ID',
  role_type VARCHAR(50) DEFAULT 'appear' COMMENT '角色在该镜头中的作用：appear=出现, speak=说话, action=动作',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE KEY uk_storyboard_character (storyboard_id, character_id),
  INDEX idx_storyboard_id (storyboard_id),
  INDEX idx_character_id (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分镜-角色关联表';

-- 分镜-场景 关联表
CREATE TABLE IF NOT EXISTS storyboard_scenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  storyboard_id INT NOT NULL COMMENT '分镜ID',
  scene_id INT NOT NULL COMMENT '场景ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (storyboard_id) REFERENCES storyboards(id) ON DELETE CASCADE,
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
  UNIQUE KEY uk_storyboard_scene (storyboard_id, scene_id),
  INDEX idx_storyboard_id (storyboard_id),
  INDEX idx_scene_id (scene_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分镜-场景关联表';

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
  query_response_mapping JSON COMMENT '查询响应的基础字段映射，提取 status 等原始值。示例: {"status": "data.task_status"}',
  query_success_condition VARCHAR(500) COMMENT '成功判断表达式(JS)。示例: status == "succeed" || status == "completed"',
  query_fail_condition VARCHAR(500) COMMENT '失败判断表达式(JS)。示例: status == "failed" || status == "error"',
  query_success_mapping JSON COMMENT '成功时的结果字段映射。示例: {"image_url": "data.task_result.images.0.url", "video_url": "data.remote_url"}',
  query_fail_mapping JSON COMMENT '失败时的错误字段映射。示例: {"error": "data.fail_reason", "message": "data.error.message"}',
  
  -- 自定义 Handler（用于无法通过模板配置覆盖的特殊 API，如特殊认证、特殊参数格式等）
  -- handler 名称对应 backend/src/customHandlers/ 目录下的文件名（不含 .js）
  custom_handler VARCHAR(100) DEFAULT NULL COMMENT '自定义提交 handler 名称，为空则走模板流程。示例: "kling_video"',
  custom_query_handler VARCHAR(100) DEFAULT NULL COMMENT '自定义查询 handler 名称，为空则走模板流程。示例: "kling_video"',
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_category (category),
  INDEX idx_provider (provider),
  INDEX idx_is_active (is_active),
  INDEX idx_category_active (category, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 模型配置表';


-- 工作流任务表（管理多步骤异步工作流）
CREATE TABLE IF NOT EXISTS workflow_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT DEFAULT NULL COMMENT '所属项目ID（管理后台任务可为NULL）',
  workflow_type VARCHAR(50) NOT NULL COMMENT '工作流类型，如 script_only, comic_generation, smart_parse',
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '工作流状态',
  current_step_index INT DEFAULT 0 COMMENT '当前执行到的步骤索引',
  total_steps INT NOT NULL COMMENT '总步骤数',
  input_params JSON COMMENT '工作流输入参数',
  error_message TEXT COMMENT '错误信息',
  is_consumed TINYINT(1) DEFAULT 0 COMMENT '前端是否已消费结果（防止重复处理）',
  started_at DATETIME DEFAULT NULL COMMENT '开始执行时间',
  completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_workflow_type (workflow_type),
  INDEX idx_status (status),
  INDEX idx_is_consumed (is_consumed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流任务表';

-- 生成任务表（工作流中的单个步骤，用于追踪异步AI生成任务）
CREATE TABLE IF NOT EXISTS generation_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT DEFAULT NULL COMMENT '所属工作流ID（独立任务可为NULL）',
  step_index INT DEFAULT 0 COMMENT '在工作流中的步骤索引',
  user_id INT NOT NULL,
  project_id INT DEFAULT NULL COMMENT '所属项目ID（管理后台任务可为NULL）',
  task_type VARCHAR(50) NOT NULL COMMENT '任务类型：script, character_extract, character_image, scene_image, storyboard, video, frame_image, scene_video, smart_parse 等',
  target_type VARCHAR(50) NOT NULL COMMENT '目标资源类型：script, character, scene, storyboard, ai_model_config',
  target_id INT DEFAULT NULL COMMENT '目标资源ID',
  model_name VARCHAR(255) COMMENT 'AI模型名称',
  input_params JSON COMMENT '输入参数',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '任务状态',
  progress INT DEFAULT 0 COMMENT '进度百分比（0-100）',
  result_data JSON COMMENT '结果数据',
  work_result JSON DEFAULT NULL COMMENT '任务执行追踪日志（引擎自动记录：步骤、耗时、参考图选择等）',
  error_message TEXT COMMENT '错误信息',
  external_task_id VARCHAR(255) COMMENT '外部任务ID（如API返回的task_id）',
  started_at DATETIME DEFAULT NULL COMMENT '开始时间',
  completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES workflow_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  INDEX idx_job_id (job_id),
  INDEX idx_step_index (step_index),
  INDEX idx_user_id (user_id),
  INDEX idx_project_id (project_id),
  INDEX idx_task_type (task_type),
  INDEX idx_status (status),
  INDEX idx_external_task_id (external_task_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成任务追踪表';

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

-- 迁移：为已有数据库添加 use_models 字段（幂等，列已存在则忽略）
-- ALTER TABLE projects ADD COLUMN use_models JSON DEFAULT NULL COMMENT 'AI模型选择配置' AFTER settings_json;

-- 迁移：为已有数据库添加 updated_scene_url 字段（State-Aware Dynamic Asset Flow）
-- ALTER TABLE storyboards ADD COLUMN updated_scene_url TEXT DEFAULT NULL COMMENT '更新版空镜场景图URL（modified镜头生成，供后续 inherit 镜头作为场景参考）' AFTER video_url;

-- 迁移：为已有数据库添加 work_result 字段（任务执行追踪日志）
-- ALTER TABLE generation_tasks ADD COLUMN work_result JSON DEFAULT NULL COMMENT '任务执行追踪日志（引擎自动记录：步骤、耗时、参考图选择等）' AFTER result_data;

-- 迁移：为已有数据库添加场景 A/B 面字段（180°轴线原则）
-- ALTER TABLE scenes ADD COLUMN reverse_image_url TEXT COMMENT '场景图片URL（B面/反打：180°反向视角空镜）' AFTER image_url;
-- ALTER TABLE scenes ADD COLUMN reverse_generation_prompt TEXT COMMENT '图片生成提示词（B面）' AFTER generation_prompt;

SET FOREIGN_KEY_CHECKS = 1;