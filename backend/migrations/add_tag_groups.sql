-- ============================================================
-- 角色标签分组系统迁移
-- ============================================================

-- 标签分组表
CREATE TABLE IF NOT EXISTS character_tag_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT '分组名称，如年龄段、风格、种族',
  color VARCHAR(20) DEFAULT '#6366f1' COMMENT '分组颜色标记(hex)',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_group (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- characters 表添加结构化标签字段
-- tag_groups_json 示例结构：
-- [
--   { "groupId": 1, "groupName": "年龄段", "tags": ["青年", "成人"] },
--   { "groupId": 2, "groupName": "风格", "tags": ["赛博朋克", "写实"] }
-- ]
ALTER TABLE characters ADD COLUMN IF NOT EXISTS tag_groups_json TEXT DEFAULT NULL COMMENT 'JSON: 结构化标签分组数据';
