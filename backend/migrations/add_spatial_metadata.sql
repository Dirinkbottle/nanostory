-- 场景空间元数据增强迁移脚本
-- 为 scenes 和 storyboards 表添加空间关系描述字段，提升AI生成图片的空间合理性

-- scenes 表新增空间字段
-- spatial_layout: JSON格式，描述前景/中景/背景空间布局
-- 示例结构：{ "foreground": "描述前景元素", "midground": "描述中景元素", "background": "描述背景元素", "depthNotes": "空间纵深备注" }
ALTER TABLE scenes ADD COLUMN spatial_layout TEXT DEFAULT NULL COMMENT 'JSON: 前景/中景/背景空间布局描述';

-- camera_defaults: JSON格式，默认摄像机参数
-- 示例结构：{ "angle": "平视/俯视/仰视", "distance": "远景/中景/近景/特写", "height": "低角度/水平/高角度", "movement": "固定/推拉/环绕" }
ALTER TABLE scenes ADD COLUMN camera_defaults TEXT DEFAULT NULL COMMENT 'JSON: 默认摄像机参数(角度/距离/高度)';

-- storyboards 表新增空间描述
-- spatial_description: JSON格式，描述角色位置、深度层、摄像机角度等空间关系
-- 示例结构：
-- {
--   "characterPositions": [
--     { "name": "角色名", "position": "前景左侧", "depth": "foreground", "facing": "面向右方" }
--   ],
--   "cameraAngle": "中景平拍",
--   "spatialRelationship": "角色A在角色B的左后方",
--   "environmentDepth": "三层纵深：前景桌椅-中景过道-远景窗户"
-- }
ALTER TABLE storyboards ADD COLUMN spatial_description TEXT DEFAULT NULL COMMENT 'JSON: 角色位置/深度层/摄像机角度等空间关系';
