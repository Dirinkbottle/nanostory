-- 为 scripts 表添加 'draft' 状态
-- 草稿状态表示用户已选择要创建的集数，但尚未开始生成

-- 修改 status 列的 ENUM 类型，添加 'draft' 状态
ALTER TABLE scripts 
MODIFY COLUMN status ENUM('draft', 'generating', 'completed', 'failed') DEFAULT 'completed' 
COMMENT '生成状态：draft=草稿, generating=生成中, completed=已完成, failed=失败';

-- 添加 draft_description 列，用于存储草稿时用户输入的故事走向
ALTER TABLE scripts 
ADD COLUMN draft_description TEXT NULL COMMENT '草稿描述（故事走向）' AFTER content;

-- 添加 draft_length 列，用于存储草稿时用户选择的长度
ALTER TABLE scripts 
ADD COLUMN draft_length VARCHAR(20) NULL COMMENT '草稿长度（短篇/中篇/长篇）' AFTER draft_description;
