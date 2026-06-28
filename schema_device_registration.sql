-- =====================================================
-- Device Registration Schema Extension
-- =====================================================
-- Adds API key support for device authentication
-- =====================================================

-- Add API key column to devices table
ALTER TABLE devices 
ADD COLUMN api_key VARCHAR(64) UNIQUE NULL AFTER user_id,
ADD COLUMN hardware_tier TINYINT UNSIGNED DEFAULT 1 AFTER device_name,
ADD INDEX idx_api_key (api_key);

-- Update existing devices with placeholder API keys (optional)
-- In production, these would be generated during registration
