-- 性能优化索引迁移
-- 幂等设计：使用 CREATE INDEX IF NOT EXISTS 和 ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- 可重复执行，不会破坏已有数据
-- 执行: mysql -u root -p nanostory < migrations/add_performance_indexes.sql

USE nanostory;

-- ============================================
-- 工作流优先级字段（用于优先调度）
-- ============================================

-- 添加优先级字段到 workflow_jobs（MySQL 8.0+ 支持 IF NOT EXISTS）
-- priority: 0=低, 1=普通(默认), 2=高
ALTER TABLE workflow_jobs 
  ADD COLUMN IF NOT EXISTS priority TINYINT DEFAULT 1 COMMENT '优先级：0=低, 1=普通, 2=高';

-- 添加优先级索引（用于按优先级调度）
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_priority 
  ON workflow_jobs(priority, created_at);

-- ============================================
-- 工作流查询优化（复合索引）
-- ============================================

-- 用户+状态 复合索引：用于 getUserJobs 等按用户查询工作流
-- 原有 idx_user_id 和 idx_status 是单独索引，复合索引能更高效支持 WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_user_status 
  ON workflow_jobs(user_id, status);

-- 项目+状态 复合索引：用于 listActive 查询项目的活跃工作流
-- 这是高频查询，前端轮询时会频繁调用
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_project_status 
  ON workflow_jobs(project_id, status);

-- 项目+用户+状态+消费标记 复合索引：用于精确过滤活跃工作流
-- 对应 generationQueryService.listActive 的查询条件
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_active_filter 
  ON workflow_jobs(user_id, project_id, status, is_consumed);

-- 工作流类型+状态 复合索引：用于按类型统计或查询
CREATE INDEX IF NOT EXISTS idx_workflow_jobs_type_status 
  ON workflow_jobs(workflow_type, status);

-- ============================================
-- 生成任务查询优化
-- ============================================

-- job_id + status 复合索引：查询工作流下特定状态的任务
-- 原有 idx_job_id 和 idx_status 是单独索引
CREATE INDEX IF NOT EXISTS idx_generation_tasks_job_status 
  ON generation_tasks(job_id, status);

-- job_id + step_index 复合索引：按工作流查询有序任务列表
CREATE INDEX IF NOT EXISTS idx_generation_tasks_job_step 
  ON generation_tasks(job_id, step_index);

-- ============================================
-- 分镜查询优化
-- ============================================

-- script_id + idx 复合索引：按剧本查询有序分镜
-- 原有 idx_script_id 是单独索引
CREATE INDEX IF NOT EXISTS idx_storyboards_script_order 
  ON storyboards(script_id, idx);

-- project_id + script_id 复合索引：按项目和剧本联合查询
CREATE INDEX IF NOT EXISTS idx_storyboards_project_script 
  ON storyboards(project_id, script_id);

-- ============================================
-- 角色/场景/道具查询优化
-- ============================================

-- 角色：project_id + source 复合索引：按项目查询特定来源的角色
CREATE INDEX IF NOT EXISTS idx_characters_project_source 
  ON characters(project_id, source);

-- 场景：project_id + source 复合索引
CREATE INDEX IF NOT EXISTS idx_scenes_project_source 
  ON scenes(project_id, source);

-- ============================================
-- 剧本查询优化
-- ============================================

-- project_id + episode_number 复合索引：按项目查询特定集数
-- 已有唯一键 uk_project_episode，但显式索引更清晰
CREATE INDEX IF NOT EXISTS idx_scripts_project_episode 
  ON scripts(project_id, episode_number);

-- project_id + status 复合索引：按项目查询特定状态的剧本
CREATE INDEX IF NOT EXISTS idx_scripts_project_status 
  ON scripts(project_id, status);

-- ============================================
-- 计费记录查询优化
-- ============================================

-- user_id + created_at 复合索引：按用户查询计费历史（时间排序）
CREATE INDEX IF NOT EXISTS idx_billing_records_user_time 
  ON billing_records(user_id, created_at);

-- user_id + source_type 复合索引：按用户和来源类型统计
CREATE INDEX IF NOT EXISTS idx_billing_records_user_source 
  ON billing_records(user_id, source_type);

-- ============================================
-- 分镜关联表查询优化
-- ============================================

-- storyboard_characters: storyboard_id + role_type 复合索引
CREATE INDEX IF NOT EXISTS idx_storyboard_characters_role 
  ON storyboard_characters(storyboard_id, role_type);
