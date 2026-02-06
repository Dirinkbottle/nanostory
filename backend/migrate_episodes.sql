-- 多集剧本支持迁移脚本
-- 添加 episode_number 和 status 字段

-- 添加 episode_number 字段（如果不存在）
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS episode_number INT NOT NULL DEFAULT 1 COMMENT '集数编号，从1开始' AFTER project_id;

-- 添加 status 字段（如果不存在）
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS status ENUM('generating', 'completed', 'failed') DEFAULT 'completed' COMMENT '生成状态' AFTER token_used;

-- 添加 updated_at 字段（如果不存在）
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- 删除旧的唯一键（如果存在）
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = DATABASE() 
               AND table_name = 'scripts' 
               AND index_name = 'uk_project_script');
SET @query = IF(@exist > 0, 'ALTER TABLE scripts DROP INDEX uk_project_script', 'SELECT 1');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加新的唯一键（项目+集数）
SET @exist2 := (SELECT COUNT(*) FROM information_schema.statistics 
                WHERE table_schema = DATABASE() 
                AND table_name = 'scripts' 
                AND index_name = 'uk_project_episode');
SET @query2 = IF(@exist2 = 0, 'ALTER TABLE scripts ADD UNIQUE KEY uk_project_episode (project_id, episode_number)', 'SELECT 1');
PREPARE stmt2 FROM @query2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_episode_number ON scripts(episode_number);
CREATE INDEX IF NOT EXISTS idx_status ON scripts(status);
