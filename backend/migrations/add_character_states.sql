-- ============================================================
-- 角色状态管理与参考图功能迁移
-- ============================================================

-- 1. 角色状态表
-- 存储角色的不同状态版本（如：童年、青年、老年；正常、战斗、受伤等）
CREATE TABLE IF NOT EXISTS character_states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  character_id INT NOT NULL COMMENT '关联的角色ID',
  name VARCHAR(100) NOT NULL COMMENT '状态名称：如童年、青年、战斗、受伤',
  description TEXT COMMENT '状态描述',
  appearance TEXT COMMENT '该状态下的外貌特征',
  image_url TEXT COMMENT '状态主图URL',
  front_view_url TEXT COMMENT '正面视图URL',
  side_view_url TEXT COMMENT '侧面视图URL',
  back_view_url TEXT COMMENT '背面视图URL',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  INDEX idx_character_id (character_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色状态表';

-- 2. 资产参考图表
-- 统一管理角色、角色状态、道具的参考图
CREATE TABLE IF NOT EXISTS asset_reference_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_type ENUM('character', 'character_state', 'prop') NOT NULL COMMENT '资产类型',
  asset_id INT NOT NULL COMMENT '关联的资产ID',
  image_url TEXT NOT NULL COMMENT '图片URL',
  description VARCHAR(255) DEFAULT NULL COMMENT '图片描述',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset (asset_type, asset_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产参考图表';
