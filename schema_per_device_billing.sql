-- =====================================================
-- Per-Device Billing Architecture Migration
-- =====================================================
-- Migrates from account-level to per-device subscriptions
-- Business Model: $ per truck/month
-- CORRECTED: No users table dependencies
-- =====================================================

-- =====================================================
-- 1. ADD SUBSCRIPTION FIELDS TO DEVICES TABLE
-- =====================================================
ALTER TABLE devices 
ADD COLUMN subscription_status ENUM('active', 'past_due', 'canceled', 'trial') NOT NULL DEFAULT 'trial' AFTER status,
ADD COLUMN paystack_subscription_code VARCHAR(100) NULL AFTER subscription_status,
ADD COLUMN subscription_expires_at TIMESTAMP NULL AFTER paystack_subscription_code,
ADD COLUMN monthly_price DECIMAL(10,2) NOT NULL DEFAULT 5000.00 AFTER subscription_expires_at,
ADD INDEX idx_subscription_status (subscription_status),
ADD INDEX idx_paystack_subscription (paystack_subscription_code);

-- =====================================================
-- 2. CREATE DEVICE_SUBSCRIPTIONS TABLE
-- =====================================================
-- Tracks individual device subscription history and events
-- user_id is treated as a simple VARCHAR (from JWT context)
CREATE TABLE IF NOT EXISTS device_subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL COMMENT 'User identifier from JWT/Auth context',
    paystack_subscription_code VARCHAR(100) NOT NULL,
    paystack_plan_code VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status ENUM('active', 'past_due', 'canceled') NOT NULL DEFAULT 'active',
    next_payment_date TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_device_id (device_id),
    INDEX idx_user_id (user_id),
    INDEX idx_paystack_subscription (paystack_subscription_code),
    INDEX idx_status (status),
    
    CONSTRAINT fk_device_subscriptions_device 
        FOREIGN KEY (device_id) 
        REFERENCES devices(device_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-device subscription tracking';

-- =====================================================
-- 3. CREATE USER_NOTIFICATION_PREFERENCES TABLE
-- =====================================================
-- user_id is treated as a simple BIGINT (from JWT context)
-- No foreign key constraint to users table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'User identifier from JWT/Auth context',
    weight_limit_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    device_offline_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_reports BOOLEAN NOT NULL DEFAULT FALSE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User notification preferences';

-- =====================================================
-- 4. USEFUL QUERIES FOR NEW ARCHITECTURE
-- =====================================================

-- Get user's fleet with per-device subscription status
/*
SELECT 
    d.device_id,
    d.device_name,
    d.truck_registration,
    d.subscription_status,
    d.subscription_expires_at,
    d.monthly_price,
    CASE 
        WHEN d.subscription_status = 'active' AND d.subscription_expires_at > NOW() THEN 'PAID'
        WHEN d.subscription_status = 'trial' THEN 'TRIAL'
        ELSE 'PAYMENT_REQUIRED'
    END as access_status
FROM devices d
WHERE d.user_id = ?
ORDER BY d.subscription_status DESC, d.created_at DESC;
*/

-- Get fleet aggregate status
/*
SELECT 
    COUNT(d.device_id) as total_devices,
    SUM(CASE WHEN d.subscription_status = 'active' THEN 1 ELSE 0 END) as active_devices,
    SUM(CASE WHEN d.subscription_status = 'past_due' THEN 1 ELSE 0 END) as past_due_devices,
    SUM(CASE WHEN d.subscription_status = 'canceled' THEN 1 ELSE 0 END) as canceled_devices,
    SUM(CASE WHEN d.subscription_status = 'trial' THEN 1 ELSE 0 END) as trial_devices,
    SUM(d.monthly_price) as total_monthly_cost,
    CASE 
        WHEN SUM(CASE WHEN d.subscription_status = 'active' THEN 1 ELSE 0 END) = COUNT(d.device_id) THEN 'all_active'
        WHEN SUM(CASE WHEN d.subscription_status = 'active' THEN 1 ELSE 0 END) > 0 THEN 'partial'
        ELSE 'inactive'
    END as overall_status
FROM devices d
WHERE d.user_id = ?;
*/

-- Get device subscription history
/*
SELECT 
    ds.id,
    ds.device_id,
    d.device_name,
    ds.status,
    ds.amount,
    ds.currency,
    ds.next_payment_date,
    ds.created_at,
    ds.updated_at
FROM device_subscriptions ds
INNER JOIN devices d ON ds.device_id = d.device_id
WHERE ds.user_id = ?
ORDER BY ds.created_at DESC;
*/

-- Find devices with expiring subscriptions (next 7 days)
/*
SELECT 
    d.device_id,
    d.device_name,
    d.truck_registration,
    d.user_id,
    d.subscription_expires_at,
    DATEDIFF(d.subscription_expires_at, NOW()) as days_remaining
FROM devices d
WHERE d.subscription_status = 'active'
  AND d.subscription_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
ORDER BY d.subscription_expires_at ASC;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next Steps:
-- 1. ✅ Go models already include new fields
-- 2. ✅ Go repositories already handle device-level subscriptions
-- 3. Update Paystack webhook to handle device subscriptions
-- 4. Update frontend to display per-device subscription status
-- =====================================================
