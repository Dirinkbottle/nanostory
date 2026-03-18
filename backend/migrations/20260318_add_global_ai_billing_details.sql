ALTER TABLE users
  MODIFY COLUMN balance DECIMAL(18,6) DEFAULT 100.000000;

ALTER TABLE billing_records
  MODIFY COLUMN unit_price DECIMAL(18,6) NOT NULL DEFAULT 0.000000,
  MODIFY COLUMN amount DECIMAL(18,6) NOT NULL DEFAULT 0.000000,
  ADD COLUMN model_name VARCHAR(255) DEFAULT NULL AFTER amount,
  ADD COLUMN model_category VARCHAR(20) DEFAULT NULL AFTER model_name,
  ADD COLUMN source_type VARCHAR(50) DEFAULT NULL AFTER model_category,
  ADD COLUMN operation_key VARCHAR(100) DEFAULT NULL AFTER source_type,
  ADD COLUMN workflow_job_id INT DEFAULT NULL AFTER operation_key,
  ADD COLUMN generation_task_id INT DEFAULT NULL AFTER workflow_job_id,
  ADD COLUMN request_status VARCHAR(50) DEFAULT NULL AFTER generation_task_id,
  ADD COLUMN charge_status VARCHAR(50) DEFAULT NULL AFTER request_status,
  ADD COLUMN currency VARCHAR(16) NOT NULL DEFAULT 'CNY' AFTER charge_status,
  ADD COLUMN input_tokens INT NOT NULL DEFAULT 0 AFTER currency,
  ADD COLUMN output_tokens INT NOT NULL DEFAULT 0 AFTER input_tokens,
  ADD COLUMN duration_seconds DECIMAL(18,6) NOT NULL DEFAULT 0.000000 AFTER output_tokens,
  ADD COLUMN item_count INT NOT NULL DEFAULT 0 AFTER duration_seconds,
  ADD COLUMN price_breakdown_json JSON DEFAULT NULL AFTER item_count,
  ADD COLUMN usage_snapshot JSON DEFAULT NULL AFTER price_breakdown_json,
  ADD COLUMN error_message TEXT AFTER usage_snapshot,
  ADD INDEX idx_charge_status (charge_status),
  ADD INDEX idx_source_type (source_type),
  ADD INDEX idx_model_category (model_category),
  ADD INDEX idx_workflow_job_id (workflow_job_id),
  ADD INDEX idx_generation_task_id (generation_task_id);

ALTER TABLE ai_model_configs
  ADD COLUMN billing_handler VARCHAR(100) DEFAULT NULL AFTER custom_query_handler,
  ADD COLUMN billing_query_handler VARCHAR(100) DEFAULT NULL AFTER billing_handler;
