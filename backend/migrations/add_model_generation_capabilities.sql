ALTER TABLE ai_model_configs
  ADD COLUMN supported_aspect_ratios JSON NULL COMMENT '模型支持的输出比例列表（图片/视频模型使用）' AFTER default_params,
  ADD COLUMN supported_durations JSON NULL COMMENT '模型支持的视频时长列表（仅视频模型使用）' AFTER supported_aspect_ratios;
