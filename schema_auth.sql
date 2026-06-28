-- =====================================================
-- Authentication & Subscription Schema Extension
-- =====================================================
-- Extends the existing IoT Telemetry Platform schema
-- with user authentication and Paystack subscription management
-- =====================================================

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    subscription_status ENUM('active', 'past_due', 'canceled') NOT NULL DEFAULT 'canceled',
    paystack_customer_code VARCHAR(100) NULL,
    paystack_subscription_code VARCHAR(100) NULL,
    subscription_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_subscription_status (subscription_status),
    INDEX idx_paystack_customer (paystack_customer_code)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='User accounts with subscription management';

-- =====================================================
-- 2. UPDATE DEVICES TABLE - Link to Users
-- =====================================================
-- Add user_id foreign key to devices table
ALTER TABLE devices 
ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER device_id,
ADD INDEX idx_user_id (user_id),
ADD CONSTRAINT fk_devices_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =====================================================
-- 3. SUBSCRIPTION EVENTS LOG
-- =====================================================
-- Track all subscription-related events from Paystack
CREATE TABLE IF NOT EXISTS subscription_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    paystack_event_id VARCHAR(100) NULL,
    subscription_code VARCHAR(100) NULL,
    amount DECIMAL(10,2) NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(50) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_paystack_event (paystack_event_id),
    INDEX idx_created_at (created_at),
    
    CONSTRAINT fk_subscription_events_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit log for subscription events';

-- =====================================================
-- 4. SAMPLE DATA
-- =====================================================
-- Insert sample users (passwords are hashed with bcrypt)
-- Password for all test users: "password123"
INSERT INTO users (email, password_hash, full_name, subscription_status, subscription_expires_at) VALUES
('john.doe@example.com', '$2a$10$rKvVLZ8Z8Z8Z8Z8Z8Z8Z8uXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx', 'John Doe', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY)),
('jane.smith@example.com', '$2a$10$rKvVLZ8Z8Z8Z8Z8Z8Z8Z8uXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Jane Smith', 'past_due', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('bob.wilson@example.com', '$2a$10$rKvVLZ8Z8Z8Z8Z8Z8Z8Z8uXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx', 'Bob Wilson', 'canceled', NULL);

-- Link existing devices to users
UPDATE devices SET user_id = (SELECT id FROM users WHERE email = 'john.doe@example.com' LIMIT 1) WHERE device_id = 'DEV-TRK-001';
UPDATE devices SET user_id = (SELECT id FROM users WHERE email = 'jane.smith@example.com' LIMIT 1) WHERE device_id = 'DEV-TRK-002';
UPDATE devices SET user_id = (SELECT id FROM users WHERE email = 'bob.wilson@example.com' LIMIT 1) WHERE device_id = 'DEV-TRK-003';

-- =====================================================
-- 5. USEFUL QUERIES
-- =====================================================

-- Get user with their devices and subscription status
/*
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.subscription_status,
    u.subscription_expires_at,
    COUNT(d.device_id) as device_count,
    GROUP_CONCAT(d.device_id) as devices
FROM users u
LEFT JOIN devices d ON u.id = d.user_id
GROUP BY u.id;
*/

-- Get subscription events for a user
/*
SELECT 
    event_type,
    amount,
    currency,
    status,
    created_at
FROM subscription_events
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
*/

-- Find users with expired subscriptions
/*
SELECT 
    id,
    email,
    full_name,
    subscription_status,
    subscription_expires_at
FROM users
WHERE subscription_status = 'active'
  AND subscription_expires_at < NOW();
*/
