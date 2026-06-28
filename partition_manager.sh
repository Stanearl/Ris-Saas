#!/bin/bash

# =====================================================
# MySQL Partition Management Script
# =====================================================
# Purpose: Automate daily partition creation and cleanup
# Schedule: Run daily via cron (e.g., at 2 AM)
# =====================================================

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-iot_telemetry}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"  # Keep 90 days of data
FUTURE_DAYS="${FUTURE_DAYS:-7}"         # Create partitions 7 days ahead

# Logging
LOG_FILE="/var/log/partition_manager.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log messages
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to execute MySQL command
execute_mysql() {
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$1" 2>&1
}

# Function to create future partitions
create_future_partitions() {
    log "Creating future partitions..."
    
    for i in $(seq 0 $FUTURE_DAYS); do
        PARTITION_DATE=$(date -d "+$i days" '+%Y-%m-%d')
        PARTITION_NAME="p$(date -d "+$i days" '+%Y%m%d')"
        
        # Check if partition already exists
        PARTITION_EXISTS=$(execute_mysql "SELECT COUNT(*) FROM INFORMATION_SCHEMA.PARTITIONS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='telemetry' AND PARTITION_NAME='$PARTITION_NAME';" | tail -n 1)
        
        if [ "$PARTITION_EXISTS" -eq "0" ]; then
            log "Creating partition: $PARTITION_NAME for date: $PARTITION_DATE"
            
            # Call stored procedure to add partition
            RESULT=$(execute_mysql "CALL add_daily_partition('$PARTITION_DATE');")
            
            if [ $? -eq 0 ]; then
                log "✓ Successfully created partition: $PARTITION_NAME"
            else
                log "✗ Failed to create partition: $PARTITION_NAME - $RESULT"
            fi
        else
            log "Partition $PARTITION_NAME already exists, skipping..."
        fi
    done
}

# Function to drop old partitions
drop_old_partitions() {
    log "Dropping partitions older than $RETENTION_DAYS days..."
    
    RESULT=$(execute_mysql "CALL drop_old_partitions($RETENTION_DAYS);")
    
    if [ $? -eq 0 ]; then
        log "✓ Successfully executed partition cleanup"
        log "$RESULT"
    else
        log "✗ Failed to execute partition cleanup - $RESULT"
    fi
}

# Function to check partition health
check_partition_health() {
    log "Checking partition health..."
    
    # Get partition statistics
    PARTITION_STATS=$(execute_mysql "
        SELECT 
            PARTITION_NAME,
            TABLE_ROWS,
            ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
            ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb,
            PARTITION_DESCRIPTION
        FROM INFORMATION_SCHEMA.PARTITIONS
        WHERE TABLE_SCHEMA = '$DB_NAME'
          AND TABLE_NAME = 'telemetry'
        ORDER BY PARTITION_ORDINAL_POSITION;
    ")
    
    log "Partition Statistics:"
    log "$PARTITION_STATS"
    
    # Check if p_future partition has data (warning sign)
    FUTURE_ROWS=$(execute_mysql "SELECT TABLE_ROWS FROM INFORMATION_SCHEMA.PARTITIONS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='telemetry' AND PARTITION_NAME='p_future';" | tail -n 1)
    
    if [ "$FUTURE_ROWS" -gt 0 ]; then
        log "⚠ WARNING: p_future partition contains $FUTURE_ROWS rows. Consider creating more future partitions."
    fi
}

# Function to optimize partitions (optional, run weekly)
optimize_partitions() {
    log "Optimizing telemetry table partitions..."
    
    RESULT=$(execute_mysql "OPTIMIZE TABLE telemetry;")
    
    if [ $? -eq 0 ]; then
        log "✓ Successfully optimized partitions"
    else
        log "✗ Failed to optimize partitions - $RESULT"
    fi
}

# Main execution
main() {
    log "=========================================="
    log "Starting Partition Management"
    log "=========================================="
    log "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    log "Retention: $RETENTION_DAYS days"
    log "Future partitions: $FUTURE_DAYS days"
    log ""
    
    # Test database connection
    log "Testing database connection..."
    CONNECTION_TEST=$(execute_mysql "SELECT 1;" 2>&1)
    if [ $? -ne 0 ]; then
        log "✗ Failed to connect to database: $CONNECTION_TEST"
        exit 1
    fi
    log "✓ Database connection successful"
    log ""
    
    # Create future partitions
    create_future_partitions
    log ""
    
    # Drop old partitions
    drop_old_partitions
    log ""
    
    # Check partition health
    check_partition_health
    log ""
    
    # Optimize partitions (uncomment to enable weekly optimization)
    # if [ "$(date +%u)" -eq 7 ]; then  # Run on Sunday
    #     optimize_partitions
    #     log ""
    # fi
    
    log "=========================================="
    log "Partition Management Completed"
    log "=========================================="
}

# Run main function
main

exit 0
