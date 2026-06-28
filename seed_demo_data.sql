-- =====================================================
-- Demo Data Seed Script for RIS Go Platform
-- =====================================================
-- Purpose: Populate database with realistic demo data
-- User: demo_john_doe (user_id = 1)
-- Devices: 3 Particle Photon 2 trucks
-- =====================================================

-- =====================================================
-- 1. CREATE DEMO USER
-- =====================================================
-- Password: "DemoPass123!" (bcrypt hashed)
INSERT INTO users (id, email, password_hash, full_name, subscription_status, subscription_expires_at, created_at, updated_at, last_login_at)
VALUES (
    1,
    'demo@risgo.com',
    '$2a$10$YourBcryptHashHere.ReplaceWithActualHash',
    'John Doe (Demo)',
    'active',
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    full_name = VALUES(full_name),
    subscription_status = VALUES(subscription_status),
    subscription_expires_at = VALUES(subscription_expires_at);

-- =====================================================
-- 2. INSERT 3 DEMO DEVICES (TRUCKS)
-- =====================================================
-- Device 1: Active subscription, Logistics truck
INSERT INTO devices (
    device_id, 
    user_id, 
    device_name, 
    hardware_tier,
    truck_registration, 
    industry, 
    load_limit_kg, 
    throttle_enabled, 
    fuel_capacity_liters, 
    status,
    subscription_status,
    paystack_subscription_code,
    subscription_expires_at,
    monthly_price,
    api_key,
    created_at,
    updated_at,
    last_seen_at
) VALUES (
    'PHOTON2-KAA-001',
    1,
    'Nairobi Express',
    2,
    'KAA-123X',
    'logistics',
    15000,
    TRUE,
    400.00,
    'active',
    'active',
    'SUB_demo_active_001',
    DATE_ADD(NOW(), INTERVAL 25 DAY),
    5000.00,
    'demo_api_key_001_photon2_nairobi',
    DATE_SUB(NOW(), INTERVAL 45 DAY),
    NOW(),
    DATE_SUB(NOW(), INTERVAL 5 MINUTE)
) ON DUPLICATE KEY UPDATE
    device_name = VALUES(device_name),
    subscription_status = VALUES(subscription_status),
    last_seen_at = VALUES(last_seen_at);

-- Device 2: Active subscription, Agriculture truck
INSERT INTO devices (
    device_id, 
    user_id, 
    device_name, 
    hardware_tier,
    truck_registration, 
    industry, 
    load_limit_kg, 
    throttle_enabled, 
    fuel_capacity_liters, 
    status,
    subscription_status,
    paystack_subscription_code,
    subscription_expires_at,
    monthly_price,
    api_key,
    created_at,
    updated_at,
    last_seen_at
) VALUES (
    'PHOTON2-KBB-002',
    1,
    'Mombasa Hauler',
    2,
    'KBB-456Y',
    'agriculture',
    12000,
    TRUE,
    350.00,
    'active',
    'active',
    'SUB_demo_active_002',
    DATE_ADD(NOW(), INTERVAL 28 DAY),
    5000.00,
    'demo_api_key_002_photon2_mombasa',
    DATE_SUB(NOW(), INTERVAL 30 DAY),
    NOW(),
    DATE_SUB(NOW(), INTERVAL 15 MINUTE)
) ON DUPLICATE KEY UPDATE
    device_name = VALUES(device_name),
    subscription_status = VALUES(subscription_status),
    last_seen_at = VALUES(last_seen_at);

-- Device 3: Past due subscription, Mining truck
INSERT INTO devices (
    device_id, 
    user_id, 
    device_name, 
    hardware_tier,
    truck_registration, 
    industry, 
    load_limit_kg, 
    throttle_enabled, 
    fuel_capacity_liters, 
    status,
    subscription_status,
    paystack_subscription_code,
    subscription_expires_at,
    monthly_price,
    api_key,
    created_at,
    updated_at,
    last_seen_at
) VALUES (
    'PHOTON2-KCC-003',
    1,
    'Kisumu Heavy',
    2,
    'KCC-789Z',
    'mining',
    25000,
    FALSE,
    600.00,
    'active',
    'past_due',
    'SUB_demo_pastdue_003',
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    5000.00,
    'demo_api_key_003_photon2_kisumu',
    DATE_SUB(NOW(), INTERVAL 60 DAY),
    NOW(),
    DATE_SUB(NOW(), INTERVAL 2 HOUR)
) ON DUPLICATE KEY UPDATE
    device_name = VALUES(device_name),
    subscription_status = VALUES(subscription_status),
    last_seen_at = VALUES(last_seen_at);

-- =====================================================
-- 3. INSERT DEVICE SUBSCRIPTIONS
-- =====================================================
-- Subscription 1: Active
INSERT INTO device_subscriptions (
    device_id,
    user_id,
    paystack_subscription_code,
    paystack_plan_code,
    amount,
    currency,
    status,
    next_payment_date,
    created_at,
    updated_at
) VALUES (
    'PHOTON2-KAA-001',
    '1',
    'SUB_demo_active_001',
    'PLN_risgo_monthly',
    5000.00,
    'NGN',
    'active',
    DATE_ADD(NOW(), INTERVAL 25 DAY),
    DATE_SUB(NOW(), INTERVAL 45 DAY),
    NOW()
) ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    next_payment_date = VALUES(next_payment_date);

-- Subscription 2: Active
INSERT INTO device_subscriptions (
    device_id,
    user_id,
    paystack_subscription_code,
    paystack_plan_code,
    amount,
    currency,
    status,
    next_payment_date,
    created_at,
    updated_at
) VALUES (
    'PHOTON2-KBB-002',
    '1',
    'SUB_demo_active_002',
    'PLN_risgo_monthly',
    5000.00,
    'NGN',
    'active',
    DATE_ADD(NOW(), INTERVAL 28 DAY),
    DATE_SUB(NOW(), INTERVAL 30 DAY),
    NOW()
) ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    next_payment_date = VALUES(next_payment_date);

-- Subscription 3: Past Due
INSERT INTO device_subscriptions (
    device_id,
    user_id,
    paystack_subscription_code,
    paystack_plan_code,
    amount,
    currency,
    status,
    next_payment_date,
    created_at,
    updated_at
) VALUES (
    'PHOTON2-KCC-003',
    '1',
    'SUB_demo_pastdue_003',
    'PLN_risgo_monthly',
    5000.00,
    'NGN',
    'past_due',
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    DATE_SUB(NOW(), INTERVAL 60 DAY),
    NOW()
) ON DUPLICATE KEY UPDATE
    status = VALUES(status),
    next_payment_date = VALUES(next_payment_date);

-- =====================================================
-- 4. INSERT USER NOTIFICATION PREFERENCES
-- =====================================================
INSERT INTO user_notification_preferences (
    user_id,
    weight_limit_alerts,
    device_offline_alerts,
    weekly_reports,
    email_notifications,
    sms_notifications,
    created_at,
    updated_at
) VALUES (
    1,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE
    weight_limit_alerts = VALUES(weight_limit_alerts),
    device_offline_alerts = VALUES(device_offline_alerts),
    weekly_reports = VALUES(weekly_reports);

-- =====================================================
-- 5. INSERT REALISTIC TELEMETRY DATA
-- =====================================================
-- Generate telemetry for the last 7 days for each device
-- This ensures the Overview page history section renders correctly

-- Device 1: Nairobi Express (KAA-123X) - Last 7 days
-- Day 1 (6 days ago) - Morning route
INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, fuel_level_liters, speed_kmh, ecu_throttle_active) VALUES
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 8 HOUR, 8500, -1.2920659, 36.8219462, 320.50, 65.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 8 HOUR + INTERVAL 30 MINUTE, 8500, -1.2950000, 36.8250000, 318.20, 70.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 9 HOUR, 8500, -1.3000000, 36.8300000, 315.80, 68.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 12 HOUR, 3200, -1.3100000, 36.8400000, 310.00, 55.00, FALSE),

-- Day 2 (5 days ago)
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 7 HOUR, 9200, -1.2920659, 36.8219462, 305.00, 60.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 10 HOUR, 9200, -1.3050000, 36.8350000, 298.50, 72.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 14 HOUR, 4100, -1.3200000, 36.8500000, 290.00, 50.00, FALSE),

-- Day 3 (4 days ago)
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 8 HOUR, 11200, -1.2920659, 36.8219462, 380.00, 58.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 11 HOUR, 11200, -1.3100000, 36.8450000, 372.00, 65.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 15 HOUR, 5200, -1.3300000, 36.8600000, 365.00, 48.00, FALSE),

-- Day 4 (3 days ago)
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 9 HOUR, 7800, -1.2920659, 36.8219462, 355.00, 62.00, FALSE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 12 HOUR, 7800, -1.3000000, 36.8300000, 348.00, 68.00, FALSE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 16 HOUR, 2900, -1.3150000, 36.8500000, 340.00, 52.00, FALSE),

-- Day 5 (2 days ago)
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 7 HOUR, 10500, -1.2920659, 36.8219462, 395.00, 64.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 10 HOUR, 10500, -1.3050000, 36.8350000, 387.00, 70.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 14 HOUR, 4500, -1.3200000, 36.8550000, 378.00, 55.00, FALSE),

-- Day 6 (yesterday)
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 8 HOUR, 9800, -1.2920659, 36.8219462, 368.00, 66.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 11 HOUR, 9800, -1.3000000, 36.8300000, 360.00, 69.00, TRUE),
('PHOTON2-KAA-001', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 15 HOUR, 3800, -1.3100000, 36.8450000, 352.00, 50.00, FALSE),

-- Day 7 (today)
('PHOTON2-KAA-001', NOW() - INTERVAL 4 HOUR, 8900, -1.2920659, 36.8219462, 340.00, 63.00, TRUE),
('PHOTON2-KAA-001', NOW() - INTERVAL 2 HOUR, 8900, -1.2980000, 36.8280000, 335.00, 67.00, TRUE),
('PHOTON2-KAA-001', NOW() - INTERVAL 5 MINUTE, 8900, -1.3020000, 36.8320000, 332.50, 65.00, TRUE);

-- Device 2: Mombasa Hauler (KBB-456Y) - Last 7 days
-- Day 1 (6 days ago)
INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, fuel_level_liters, speed_kmh, ecu_throttle_active) VALUES
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 6 HOUR, 5200, -4.0434771, 39.6682065, 280.00, 55.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 9 HOUR, 5200, -4.0500000, 39.6750000, 275.00, 58.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 13 HOUR, 2100, -4.0600000, 39.6850000, 268.00, 52.00, FALSE),

-- Day 2 (5 days ago)
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 7 HOUR, 6800, -4.0434771, 39.6682065, 340.00, 60.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 10 HOUR, 6800, -4.0500000, 39.6750000, 332.00, 62.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 14 HOUR, 2800, -4.0650000, 39.6900000, 325.00, 48.00, FALSE),

-- Day 3 (4 days ago)
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 6 HOUR, 7500, -4.0434771, 39.6682065, 315.00, 57.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 9 HOUR, 7500, -4.0550000, 39.6800000, 308.00, 60.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 13 HOUR, 3200, -4.0700000, 39.6950000, 300.00, 50.00, FALSE),

-- Day 4 (3 days ago)
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 7 HOUR, 5900, -4.0434771, 39.6682065, 290.00, 56.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 10 HOUR, 5900, -4.0500000, 39.6750000, 283.00, 59.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 14 HOUR, 2500, -4.0600000, 39.6850000, 275.00, 51.00, FALSE),

-- Day 5 (2 days ago)
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 6 HOUR, 8200, -4.0434771, 39.6682065, 345.00, 58.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 9 HOUR, 8200, -4.0550000, 39.6800000, 337.00, 61.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 13 HOUR, 3500, -4.0700000, 39.6950000, 328.00, 49.00, FALSE),

-- Day 6 (yesterday)
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 7 HOUR, 6500, -4.0434771, 39.6682065, 318.00, 57.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, 6500, -4.0500000, 39.6750000, 310.00, 60.00, FALSE),
('PHOTON2-KBB-002', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 14 HOUR, 2900, -4.0650000, 39.6900000, 302.00, 50.00, FALSE),

-- Day 7 (today)
('PHOTON2-KBB-002', NOW() - INTERVAL 3 HOUR, 7100, -4.0434771, 39.6682065, 292.00, 56.00, FALSE),
('PHOTON2-KBB-002', NOW() - INTERVAL 1 HOUR, 7100, -4.0500000, 39.6750000, 287.00, 58.00, FALSE),
('PHOTON2-KBB-002', NOW() - INTERVAL 15 MINUTE, 7100, -4.0550000, 39.6800000, 284.00, 57.00, FALSE);

-- Device 3: Kisumu Heavy (KCC-789Z) - Last 7 days (Past Due - Limited data)
-- Day 1 (6 days ago)
INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, fuel_level_liters, speed_kmh, ecu_throttle_active) VALUES
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 5 HOUR, 18000, -0.0917016, 34.7679568, 450.00, 45.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 8 HOUR, 18000, -0.1000000, 34.7750000, 442.00, 48.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 12 HOUR, 8500, -0.1100000, 34.7850000, 435.00, 42.00, FALSE),

-- Day 2 (5 days ago)
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 6 HOUR, 22000, -0.0917016, 34.7679568, 580.00, 40.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 9 HOUR, 22000, -0.1000000, 34.7750000, 570.00, 43.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 13 HOUR, 9200, -0.1150000, 34.7900000, 560.00, 38.00, FALSE),

-- Day 3 (4 days ago) - Subscription expired, limited data
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 7 HOUR, 19500, -0.0917016, 34.7679568, 545.00, 42.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 14 HOUR, 7800, -0.1100000, 34.7850000, 530.00, 40.00, FALSE),

-- Day 4-6 (Minimal activity due to past_due status)
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 8 HOUR, 15000, -0.0917016, 34.7679568, 515.00, 38.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 9 HOUR, 12000, -0.0950000, 34.7700000, 500.00, 35.00, FALSE),
('PHOTON2-KCC-003', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, 8000, -0.1000000, 34.7750000, 485.00, 32.00, FALSE),

-- Day 7 (today) - Last reading 2 hours ago
('PHOTON2-KCC-003', NOW() - INTERVAL 2 HOUR, 5500, -0.0917016, 34.7679568, 470.00, 30.00, FALSE);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Uncomment to verify data insertion

-- Check devices
-- SELECT device_id, device_name, subscription_status, last_seen_at FROM devices WHERE user_id = 1;

-- Check subscriptions
-- SELECT device_id, status, next_payment_date FROM device_subscriptions WHERE user_id = '1';

-- Check telemetry count per device
-- SELECT device_id, COUNT(*) as reading_count, MIN(timestamp) as first_reading, MAX(timestamp) as last_reading 
-- FROM telemetry 
-- WHERE device_id IN ('PHOTON2-KAA-001', 'PHOTON2-KBB-002', 'PHOTON2-KCC-003')
-- GROUP BY device_id;

-- Check notification preferences
-- SELECT * FROM user_notification_preferences WHERE user_id = 1;

-- =====================================================
-- SEED COMPLETE
-- =====================================================
-- Summary:
-- ✅ 1 Demo user created (demo@risgo.com)
-- ✅ 3 Devices registered (2 active, 1 past_due)
-- ✅ 3 Device subscriptions created
-- ✅ 1 Notification preference record
-- ✅ ~70 telemetry readings (7 days of realistic data)
-- 
-- Next Steps:
-- 1. Update demo user password hash with actual bcrypt hash
-- 2. Test login with demo@risgo.com
-- 3. Verify Overview page displays telemetry history
-- 4. Verify Fleet page shows subscription badges correctly
-- =====================================================
