-- ============================================
-- 迁移脚本：添加系统配置和用户设置功能
-- 创建时间：2026-03-04
-- 说明：为现有数据库添加系统配置表和用户设置字段
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE nanostory;

-- ============================================
-- 1. 为 users 表添加 settings 字段
-- ============================================
-- 检查字段是否存在，如果不存在则添加
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'nanostory'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'settings'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE users ADD COLUMN settings JSON DEFAULT NULL COMMENT ''用户通用设置（JSON格式，键值对）'' AFTER balance',
  'SELECT ''Column settings already exists in users table'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 创建 system_configs 表
-- ============================================
CREATE TABLE IF NOT EXISTS system_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键，如 video_aspect_ratios, video_durations',
  config_name VARCHAR(255) NOT NULL COMMENT '配置名称（显示用）',
  config_type ENUM('options', 'key_value', 'text', 'number', 'boolean') DEFAULT 'options' COMMENT '配置类型',
  config_value JSON NOT NULL COMMENT '配置值（JSON格式）',
  description TEXT COMMENT '配置说明',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================
-- 3. 初始化系统配置：视频长宽比选项
-- ============================================
INSERT INTO system_configs (config_key, config_name, config_type, config_value, description, is_active)
VALUES (
  'video_aspect_ratios',
  '视频长宽比选项',
  'options',
  '[
    {"label": "16:9 (横屏)", "value": "16:9"},
    {"label": "9:16 (竖屏)", "value": "9:16"},
    {"label": "1:1 (方形)", "value": "1:1"},
    {"label": "4:3 (标准)", "value": "4:3"},
    {"label": "21:9 (超宽)", "value": "21:9"}
  ]',
  '视频生成时可选的长宽比选项',
  1
)
ON DUPLICATE KEY UPDATE
  config_name=VALUES(config_name),
  config_value=VALUES(config_value),
  description=VALUES(description),
  updated_at=CURRENT_TIMESTAMP;

-- ============================================
-- 4. 初始化系统配置：视频时长选项
-- ============================================
INSERT INTO system_configs (config_key, config_name, config_type, config_value, description, is_active)
VALUES (
  'video_durations',
  '视频时长选项',
  'options',
  '[
    {"label": "2秒", "value": 2},
    {"label": "3秒", "value": 3},
    {"label": "5秒", "value": 5},
    {"label": "10秒", "value": 10}
  ]',
  '视频生成时可选的时长选项（秒）',
  1
)
ON DUPLICATE KEY UPDATE
  config_name=VALUES(config_name),
  config_value=VALUES(config_value),
  description=VALUES(description),
  updated_at=CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 迁移完成
-- ============================================
SELECT 'Migration completed successfully!' AS status;
SELECT
  'Added settings column to users table' AS step1,
  'Created system_configs table' AS step2,
  'Initialized video_aspect_ratios config' AS step3,
  'Initialized video_durations config' AS step4;
