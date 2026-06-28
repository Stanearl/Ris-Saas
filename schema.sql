-- =====================================================
-- IoT Telemetry Platform - MySQL 8.0 Database Schema
-- =====================================================
-- Designed for: 10,000+ trucks, 14.4M records/day
-- Optimized for: Time-series queries, high-volume inserts
-- =====================================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS devices;

-- =====================================================
-- 1. DEVICES TABLE
-- =====================================================
-- Stores device configurations and metadata
-- =====================================================

CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    truck_registration VARCHAR(50),
    industry ENUM('agriculture', 'logistics', 'mining', 'construction', 'other') NOT NULL DEFAULT 'other',
    load_limit_kg INT UNSIGNED NOT NULL DEFAULT 10000,
    throttle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fuel_capacity_liters DECIMAL(8,2),
    status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NULL,
    
    INDEX idx_status (status),
    INDEX idx_industry (industry),
    INDEX idx_last_seen (last_seen_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Device registry and configuration';

-- =====================================================
-- 2. TELEMETRY TABLE (PARTITIONED)
-- =====================================================
-- Stores time-series telemetry data
-- Partitioned by RANGE on timestamp (daily partitions)
-- =====================================================

CREATE TABLE telemetry (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP(3) NOT NULL,  -- Millisecond precision
    weight_kg INT UNSIGNED NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,  -- ~1cm precision
    longitude DECIMAL(10, 7) NOT NULL, -- ~1cm precision
    fuel_level_liters DECIMAL(8,2) NULL,
    speed_kmh DECIMAL(5,2) NULL,
    ecu_throttle_active BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Composite primary key for partitioning compatibility
    PRIMARY KEY (id, timestamp),
    
    -- Optimized indexes for common query patterns
    INDEX idx_device_timestamp (device_id, timestamp DESC),
    INDEX idx_timestamp (timestamp),
    INDEX idx_device_weight (device_id, weight_kg),
    
    -- Foreign key constraint
    CONSTRAINT fk_telemetry_device 
        FOREIGN KEY (device_id) 
        REFERENCES devices(device_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
        
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Partitioned telemetry data - time series'
  
-- =====================================================
-- PARTITIONING STRATEGY: RANGE by day
-- =====================================================
-- Initial partitions for 30 days + future partition
-- Automated partition management recommended via cron
-- =====================================================

PARTITION BY RANGE (UNIX_TIMESTAMP(timestamp)) (
    -- Week 1
    PARTITION p20260626 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-27 00:00:00')),
    PARTITION p20260627 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-28 00:00:00')),
    PARTITION p20260628 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-29 00:00:00')),
    PARTITION p20260629 VALUES LESS THAN (UNIX_TIMESTAMP('2026-06-30 00:00:00')),
    PARTITION p20260630 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-01 00:00:00')),
    PARTITION p20260701 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-02 00:00:00')),
    PARTITION p20260702 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-03 00:00:00')),
    
    -- Week 2
    PARTITION p20260703 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-04 00:00:00')),
    PARTITION p20260704 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-05 00:00:00')),
    PARTITION p20260705 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-06 00:00:00')),
    PARTITION p20260706 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-07 00:00:00')),
    PARTITION p20260707 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-08 00:00:00')),
    PARTITION p20260708 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-09 00:00:00')),
    PARTITION p20260709 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-10 00:00:00')),
    
    -- Week 3
    PARTITION p20260710 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-11 00:00:00')),
    PARTITION p20260711 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-12 00:00:00')),
    PARTITION p20260712 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-13 00:00:00')),
    PARTITION p20260713 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-14 00:00:00')),
    PARTITION p20260714 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-15 00:00:00')),
    PARTITION p20260715 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-16 00:00:00')),
    PARTITION p20260716 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-17 00:00:00')),
    
    -- Week 4
    PARTITION p20260717 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-18 00:00:00')),
    PARTITION p20260718 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-19 00:00:00')),
    PARTITION p20260719 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-20 00:00:00')),
    PARTITION p20260720 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-21 00:00:00')),
    PARTITION p20260721 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-22 00:00:00')),
    PARTITION p20260722 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-23 00:00:00')),
    PARTITION p20260723 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-24 00:00:00')),
    PARTITION p20260724 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-25 00:00:00')),
    PARTITION p20260725 VALUES LESS THAN (UNIX_TIMESTAMP('2026-07-26 00:00:00')),
    
    -- Future partition (catch-all for data beyond defined partitions)
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- =====================================================
-- PARTITION MANAGEMENT PROCEDURES
-- =====================================================

DELIMITER $$

-- Procedure to add new daily partition
CREATE PROCEDURE add_daily_partition(IN partition_date DATE)
BEGIN
    DECLARE partition_name VARCHAR(20);
    DECLARE next_date DATE;
    DECLARE partition_value BIGINT;
    
    SET partition_name = CONCAT('p', DATE_FORMAT(partition_date, '%Y%m%d'));
    SET next_date = DATE_ADD(partition_date, INTERVAL 1 DAY);
    SET partition_value = UNIX_TIMESTAMP(next_date);
    
    -- Reorganize the future partition to add new partition
    SET @sql = CONCAT(
        'ALTER TABLE telemetry REORGANIZE PARTITION p_future INTO (',
        'PARTITION ', partition_name, ' VALUES LESS THAN (', partition_value, '),',
        'PARTITION p_future VALUES LESS THAN MAXVALUE)'
    );
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    SELECT CONCAT('Partition ', partition_name, ' created successfully') AS result;
END$$

-- Procedure to drop old partitions (data retention policy)
CREATE PROCEDURE drop_old_partitions(IN retention_days INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE part_name VARCHAR(64);
    DECLARE part_desc TEXT;
    DECLARE cutoff_timestamp BIGINT;
    
    DECLARE partition_cursor CURSOR FOR
        SELECT PARTITION_NAME, PARTITION_DESCRIPTION
        FROM INFORMATION_SCHEMA.PARTITIONS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'telemetry'
          AND PARTITION_NAME != 'p_future'
          AND PARTITION_DESCRIPTION != 'MAXVALUE';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET cutoff_timestamp = UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL retention_days DAY));
    
    OPEN partition_cursor;
    
    read_loop: LOOP
        FETCH partition_cursor INTO part_name, part_desc;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        IF CAST(part_desc AS UNSIGNED) < cutoff_timestamp THEN
            SET @sql = CONCAT('ALTER TABLE telemetry DROP PARTITION ', part_name);
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            SELECT CONCAT('Dropped partition: ', part_name) AS result;
        END IF;
    END LOOP;
    
    CLOSE partition_cursor;
END$$

DELIMITER ;

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Insert sample devices
INSERT INTO devices (device_id, device_name, truck_registration, industry, load_limit_kg, throttle_enabled, fuel_capacity_liters, status) VALUES
('DEV-TRK-001', 'Truck Alpha', 'KAA-123X', 'logistics', 15000, TRUE, 400.00, 'active'),
('DEV-TRK-002', 'Truck Beta', 'KBB-456Y', 'agriculture', 12000, TRUE, 350.00, 'active'),
('DEV-TRK-003', 'Truck Gamma', 'KCC-789Z', 'mining', 25000, FALSE, 600.00, 'active');

-- Insert sample telemetry data
INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, fuel_level_liters, speed_kmh, ecu_throttle_active) VALUES
('DEV-TRK-001', '2026-06-26 08:00:00', 8500, -1.2920659, 36.8219462, 320.50, 65.00, TRUE),
('DEV-TRK-001', '2026-06-26 08:01:00', 8500, -1.2925000, 36.8225000, 320.30, 68.00, TRUE),
('DEV-TRK-002', '2026-06-26 08:00:00', 5200, -1.1000000, 37.0000000, 280.00, 55.00, FALSE),
('DEV-TRK-003', '2026-06-26 08:00:00', 18000, -1.5000000, 36.5000000, 450.00, 45.00, FALSE);

-- =====================================================
-- OPTIMIZED QUERY EXAMPLES
-- =====================================================

-- Query 1: Get single truck's path over last 24 hours
-- This query benefits from idx_device_timestamp index
/*
SELECT 
    timestamp,
    latitude,
    longitude,
    speed_kmh,
    weight_kg
FROM telemetry
WHERE device_id = 'DEV-TRK-001'
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;
*/

-- Query 2: Get latest telemetry for all active devices
/*
SELECT 
    d.device_id,
    d.device_name,
    d.truck_registration,
    t.timestamp,
    t.latitude,
    t.longitude,
    t.weight_kg,
    t.speed_kmh,
    CASE 
        WHEN t.weight_kg > d.load_limit_kg THEN 'OVERLOADED'
        ELSE 'OK'
    END AS load_status
FROM devices d
LEFT JOIN LATERAL (
    SELECT *
    FROM telemetry
    WHERE device_id = d.device_id
    ORDER BY timestamp DESC
    LIMIT 1
) t ON TRUE
WHERE d.status = 'active';
*/

-- Query 3: Aggregate statistics for a device over time range
/*
SELECT 
    device_id,
    DATE(timestamp) AS date,
    COUNT(*) AS reading_count,
    AVG(weight_kg) AS avg_weight,
    MAX(weight_kg) AS max_weight,
    AVG(speed_kmh) AS avg_speed,
    MAX(speed_kmh) AS max_speed,
    AVG(fuel_level_liters) AS avg_fuel
FROM telemetry
WHERE device_id = 'DEV-TRK-001'
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY device_id, DATE(timestamp)
ORDER BY date DESC;
*/

-- Query 4: Find overloaded trucks in real-time
/*
SELECT 
    t.device_id,
    d.device_name,
    t.timestamp,
    t.weight_kg,
    d.load_limit_kg,
    (t.weight_kg - d.load_limit_kg) AS excess_weight_kg,
    t.latitude,
    t.longitude
FROM telemetry t
INNER JOIN devices d ON t.device_id = d.device_id
WHERE t.timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  AND t.weight_kg > d.load_limit_kg
ORDER BY t.timestamp DESC;
*/

-- =====================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- =====================================================
/*
1. PARTITIONING BENEFITS:
   - Partition pruning: Queries with time filters only scan relevant partitions
   - Faster deletes: Drop entire partitions instead of DELETE operations
   - Parallel query execution across partitions
   - Reduced index size per partition

2. INDEX STRATEGY:
   - idx_device_timestamp: Optimized for single-device time-range queries
   - Composite index with DESC on timestamp for recent-data queries
   - Covering indexes reduce table lookups

3. DATA RETENTION:
   - Use drop_old_partitions() procedure in cron job
   - Example: Keep 90 days, drop older partitions weekly
   - Much faster than DELETE operations

4. BULK INSERT OPTIMIZATION:
   - Use batch inserts (1000-5000 rows per transaction)
   - Disable autocommit for bulk operations
   - Consider LOAD DATA INFILE for massive imports

5. MONITORING:
   - Monitor partition sizes: SELECT * FROM INFORMATION_SCHEMA.PARTITIONS
   - Track index usage: sys.schema_unused_indexes
   - Watch for slow queries: slow_query_log

6. SCALING CONSIDERATIONS:
   - Consider weekly partitions if daily becomes too granular
   - Implement read replicas for analytics queries
   - Use connection pooling (recommended: 100-200 connections)
   - Consider archiving old data to separate archive table/database
*/
