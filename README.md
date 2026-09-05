# IoT Telemetry Platform for Fleet Compliance

A highly optimized, industry-grade IoT telemetry platform built with Go and MySQL 8.0 for tracking commercial trucks across agriculture, logistics, mining, and other industries.

## 🚀 Features

- **High-Volume Data Ingestion**: Handles 14.4M+ records/day (10,000+ trucks @ 1 payload/minute)
- **Partitioned Database**: MySQL RANGE partitioning by day for optimal performance
- **Batch Processing**: Supports both single and batch telemetry submissions
- **RESTful API**: Clean JSON API with comprehensive error handling
- **Real-time Tracking**: GPS coordinates, weight, fuel, speed, and ECU throttle monitoring
- **Automated Partition Management**: Daily partition creation and cleanup
- **Connection Pooling**: Optimized database connection management
- **Device Configuration**: Remote device configuration sync

## 📊 System Specifications

| Metric | Value |
|--------|-------|
| **Data Frequency** | 1 payload per minute per truck |
| **Scale Capacity** | 10,000+ trucks |
| **Daily Records** | ~14.4 million |
| **Database** | MySQL 8.0 with InnoDB |
| **Backend** | Go 1.21+ |
| **Partitioning** | Daily RANGE partitions |

## 📁 Project Structure

```
RIS Go/
├── schema.sql              # MySQL database schema with partitioning
├── main.go                 # Go backend API server
├── go.mod                  # Go module dependencies
├── api-contract.md         # Complete API documentation
├── partition_manager.sh    # Automated partition management script
└── README.md              # This file
```

## 🛠️ Prerequisites

- **Go**: Version 1.21 or higher
- **MySQL**: Version 8.0 or higher
- **Operating System**: Linux/Unix (for partition manager script)
- **Bash**: For running automation scripts

## 📦 Installation

### 1. Clone or Setup Project

```bash
cd "c:\Users\stane\Desktop\RIS Go"
```

### 2. Install Go Dependencies

```bash
go mod download
```

### 3. Setup MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE iot_telemetry;

# Import schema
mysql -u root -p iot_telemetry < schema.sql
```

### 4. Configure Environment Variables

Create a `.env` file or export environment variables:

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=iot_telemetry
export SERVER_PORT=8080
```

### 5. Run the Application

```bash
go run main.go
```

The server will start on `http://localhost:8080`

## 🔧 Configuration

### Database Connection Pool Settings

The application is pre-configured with optimized connection pool settings:

```go
MaxOpenConns:     100          // Maximum open connections
MaxIdleConns:     20           // Maximum idle connections
ConnMaxLifetime:  1 hour       // Connection lifetime
ConnMaxIdleTime:  10 minutes   // Idle connection timeout
```

### Partition Management

The `partition_manager.sh` script automates partition lifecycle:

```bash
# Configuration variables
RETENTION_DAYS=90    # Keep 90 days of data
FUTURE_DAYS=7        # Create partitions 7 days ahead
```

## 📡 API Endpoints

### 1. Telemetry Ingestion

**POST** `/v1/telemetry`

Submit single or batch telemetry data.

**Single Payload Example:**
```bash
curl -X POST http://localhost:8080/v1/telemetry \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-TRK-001",
    "timestamp": "2026-06-26T08:00:00.000Z",
    "weight_kg": 8500,
    "latitude": -1.2920659,
    "longitude": 36.8219462,
    "fuel_level_liters": 320.5,
    "speed_kmh": 65.0,
    "ecu_throttle_active": true
  }'
```

**Batch Payload Example:**
```bash
curl -X POST http://localhost:8080/v1/telemetry \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-TRK-001",
    "readings": [
      {
        "timestamp": "2026-06-26T08:00:00.000Z",
        "weight_kg": 8500,
        "latitude": -1.2920659,
        "longitude": 36.8219462,
        "fuel_level_liters": 320.5,
        "speed_kmh": 65.0,
        "ecu_throttle_active": true
      }
    ]
  }'
```

### 2. Device Heartbeat

**POST** `/v1/devices/{device_id}/heartbeat`

Update device status and last seen timestamp.

```bash
curl -X POST http://localhost:8080/v1/devices/DEV-TRK-001/heartbeat \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-06-26T08:00:00.000Z",
    "status": "active"
  }'
```

### 3. Device Configuration

**GET** `/v1/devices/{device_id}/config`

Retrieve device configuration.

```bash
curl -X GET http://localhost:8080/v1/devices/DEV-TRK-001/config \
  -H "X-API-Key: YOUR_API_KEY"
```

### 4. Health Check

**GET** `/health`

Check service and database health.

```bash
curl http://localhost:8080/health
```

## 🗄️ Database Schema

### Devices Table

Stores device configurations and metadata.

```sql
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    truck_registration VARCHAR(50),
    industry ENUM('agriculture', 'logistics', 'mining', 'construction', 'other'),
    load_limit_kg INT UNSIGNED NOT NULL DEFAULT 10000,
    throttle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fuel_capacity_liters DECIMAL(8,2),
    status ENUM('active', 'inactive', 'maintenance'),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NULL
);
```

### Telemetry Table (Partitioned)

Stores time-series telemetry data with daily partitions.

```sql
CREATE TABLE telemetry (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    device_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP(3) NOT NULL,
    weight_kg DECIMAL(10,3) UNSIGNED NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    fuel_level_liters DECIMAL(8,2) NULL,
    speed_kmh DECIMAL(5,2) NULL,
    ecu_throttle_active BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id, timestamp),
    INDEX idx_device_timestamp (device_id, timestamp DESC)
) PARTITION BY RANGE (UNIX_TIMESTAMP(timestamp)) (...);
```

## 🔄 Partition Management

### Automated Management (Recommended)

Setup a cron job to run the partition manager daily:

```bash
# Make script executable
chmod +x partition_manager.sh

# Add to crontab (runs daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /path/to/partition_manager.sh
```

### Manual Partition Management

**Create a new partition:**
```sql
CALL add_daily_partition('2026-07-01');
```

**Drop old partitions (keep 90 days):**
```sql
CALL drop_old_partitions(90);
```

**View partition statistics:**
```sql
SELECT 
    PARTITION_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
FROM INFORMATION_SCHEMA.PARTITIONS
WHERE TABLE_SCHEMA = 'iot_telemetry'
  AND TABLE_NAME = 'telemetry'
ORDER BY PARTITION_ORDINAL_POSITION;
```

## 📈 Performance Optimization

### Query Optimization

The schema includes optimized indexes for common query patterns:

1. **Single truck path over time:**
```sql
SELECT timestamp, latitude, longitude, speed_kmh, weight_kg
FROM telemetry
WHERE device_id = 'DEV-TRK-001'
  AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;
```

2. **Find overloaded trucks:**
```sql
SELECT t.device_id, d.device_name, t.weight_kg, d.load_limit_kg
FROM telemetry t
INNER JOIN devices d ON t.device_id = d.device_id
WHERE t.timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
  AND t.weight_kg > d.load_limit_kg;
```

### Partitioning Benefits

- **Partition Pruning**: Queries with time filters only scan relevant partitions
- **Faster Deletes**: Drop entire partitions instead of DELETE operations
- **Parallel Execution**: MySQL can query multiple partitions in parallel
- **Reduced Index Size**: Smaller indexes per partition improve performance

### Bulk Insert Optimization

- Use batch inserts (10-20 readings per request)
- Transactions are used for batch operations
- Connection pooling reduces overhead

## 🔒 Security Considerations

### Production Deployment Checklist

- [ ] Use strong database passwords
- [ ] Implement proper JWT/API key authentication
- [ ] Enable HTTPS/TLS for all communications
- [ ] Set up firewall rules (allow only necessary ports)
- [ ] Use environment variables for sensitive data
- [ ] Implement rate limiting per device
- [ ] Enable MySQL audit logging
- [ ] Regular security updates
- [ ] Backup strategy implementation

### Authentication

The current implementation uses simple API key authentication. For production:

1. Implement JWT-based authentication
2. Store API keys securely (hashed in database)
3. Implement token rotation
4. Add role-based access control (RBAC)

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor

1. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Partition sizes
   - Index usage

2. **Application Performance**
   - Request latency
   - Throughput (requests/second)
   - Error rates
   - Memory usage

3. **Partition Health**
   - Number of active partitions
   - Rows per partition
   - p_future partition usage

### Maintenance Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Create partitions | Daily | `partition_manager.sh` |
| Drop old partitions | Daily | `partition_manager.sh` |
| Optimize tables | Weekly | `OPTIMIZE TABLE telemetry;` |
| Backup database | Daily | `mysqldump` |
| Monitor slow queries | Continuous | Enable `slow_query_log` |

## 🚀 Scaling Strategies

### Horizontal Scaling

1. **Read Replicas**: Deploy MySQL read replicas for analytics queries
2. **Load Balancing**: Use nginx/HAProxy for API load balancing
3. **Sharding**: Shard by device_id for extreme scale (100K+ devices)

### Vertical Scaling

1. **Increase MySQL resources**: More RAM, CPU, faster storage (SSD/NVMe)
2. **Optimize buffer pool**: Set `innodb_buffer_pool_size` to 70-80% of RAM
3. **Tune connection pool**: Adjust based on load testing

### Data Archiving

For long-term data retention:

1. Archive partitions older than 90 days to separate database
2. Use compressed storage for archived data
3. Implement data warehouse for historical analytics

## 🧪 Testing

### Test Database Setup

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE iot_telemetry_test;"
mysql -u root -p iot_telemetry_test < schema.sql
```

### Sample Test Data

The schema includes sample devices and telemetry data for testing.

### Load Testing

Use tools like Apache JMeter or k6 for load testing:

```bash
# Example with k6
k6 run --vus 100 --duration 30s load_test.js
```

## 📚 Additional Documentation

- **API Contract**: See `api-contract.md` for complete API documentation
- **Database Schema**: See `schema.sql` for detailed schema and query examples
- **Go Implementation**: See `main.go` for backend implementation

## 🐛 Troubleshooting

### Common Issues

**1. Connection refused to MySQL**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check connection
mysql -u root -p -e "SELECT 1;"
```

**2. Partition creation fails**
```bash
# Check partition exists
SELECT * FROM INFORMATION_SCHEMA.PARTITIONS 
WHERE TABLE_NAME = 'telemetry';

# Manually create partition
CALL add_daily_partition('2026-06-27');
```

**3. High memory usage**
```bash
# Check connection pool settings
# Reduce MaxOpenConns if needed
```

## 📄 License

This project is proprietary software for fleet compliance tracking.

## 👥 Support

For technical support and questions:
- Email: support@yourcompany.com
- Documentation: https://docs.yourcompany.com

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-26 | Initial release with partitioned schema and Go backend |

---

**Built with ❤️ for fleet compliance and safety**
