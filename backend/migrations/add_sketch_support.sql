-- 分镜草图字段
ALTER TABLE storyboards 
  ADD COLUMN sketch_url TEXT DEFAULT NULL,
  ADD COLUMN sketch_type VARCHAR(32) DEFAULT NULL,
  ADD COLUMN sketch_data JSON DEFAULT NULL,
  ADD COLUMN control_strength DECIMAL(3,2) DEFAULT 0.85;

-- 草图类型枚举说明：
-- 'stick_figure'       → 火柴人/极简草稿 → 对应 ControlNet Scribble
-- 'storyboard_sketch'  → 分镜草图       → 对应 ControlNet Canny
-- 'detailed_lineart'   → 精细线稿       → 对应 ControlNet Lineart

-- 场景草图（可选，用于场景级草图）
ALTER TABLE scenes
  ADD COLUMN sketch_url TEXT DEFAULT NULL;
