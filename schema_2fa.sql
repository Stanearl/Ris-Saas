-- =====================================================
-- Two-Factor Authentication Schema Extension
-- =====================================================
-- Adds TOTP 2FA support to users table
-- =====================================================

-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN totp_secret VARCHAR(255) NULL AFTER password_hash,
ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER totp_secret,
ADD INDEX idx_totp_enabled (totp_enabled);

-- Note: totp_secret is encrypted/encoded and stored securely
-- totp_enabled indicates if user has completed 2FA setup
