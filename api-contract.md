# IoT Telemetry Platform - API Contract

## Overview
This document defines the JSON API contract for hardware/edge devices to send telemetry data to the Go backend.

**Base URL:** `https://api.yourplatform.com/v1`  
**Authentication:** Bearer Token (JWT) or API Key  
**Content-Type:** `application/json`

---

## 1. Telemetry Ingestion API

### Endpoint: POST /telemetry

**Description:** Submit telemetry data from IoT devices. Supports both single and batch payloads.

### Authentication
```http
Authorization: Bearer <JWT_TOKEN>
```
or
```http
X-API-Key: <DEVICE_API_KEY>
```

---

### Request Format

#### Single Telemetry Payload

```json
{
  "device_id": "DEV-TRK-001",
  "timestamp": "2026-06-26T08:00:00.000Z",
  "weight_kg": 8500,
  "latitude": -1.2920659,
  "longitude": 36.8219462,
  "fuel_level_liters": 320.5,
  "speed_kmh": 65.0,
  "ecu_throttle_active": true
}
```

#### Batch Telemetry Payload (Recommended for efficiency)

```json
{
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
    },
    {
      "timestamp": "2026-06-26T08:01:00.000Z",
      "weight_kg": 8500,
      "latitude": -1.2925000,
      "longitude": 36.8225000,
      "fuel_level_liters": 320.3,
      "speed_kmh": 68.0,
      "ecu_throttle_active": true
    },
    {
      "timestamp": "2026-06-26T08:02:00.000Z",
      "weight_kg": 8500,
      "latitude": -1.2930000,
      "longitude": 36.8230000,
      "fuel_level_liters": 320.1,
      "speed_kmh": 70.0,
      "ecu_throttle_active": true
    }
  ]
}
```

---

### Request Schema

#### Single Payload Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `device_id` | string | Yes | Max 50 chars | Unique device identifier |
| `timestamp` | string (ISO 8601) | Yes | Valid UTC timestamp | Time of reading (millisecond precision) |
| `weight_kg` | integer | Yes | >= 0 | Current load weight in kilograms |
| `latitude` | number | Yes | -90 to 90, 7 decimal places | GPS latitude coordinate |
| `longitude` | number | Yes | -180 to 180, 7 decimal places | GPS longitude coordinate |
| `fuel_level_liters` | number | No | >= 0, 2 decimal places | Current fuel level in liters (nullable) |
| `speed_kmh` | number | No | >= 0, 2 decimal places | Current speed in km/h (nullable) |
| `ecu_throttle_active` | boolean | Yes | true/false | ECU throttle status |

#### Batch Payload Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `device_id` | string | Yes | Max 50 chars | Unique device identifier |
| `readings` | array | Yes | 1-100 items | Array of telemetry readings |

Each item in `readings` array follows the single payload schema (excluding `device_id`).

---

### Response Format

#### Success Response (201 Created)

**Single Payload:**
```json
{
  "status": "success",
  "message": "Telemetry data received",
  "data": {
    "device_id": "DEV-TRK-001",
    "timestamp": "2026-06-26T08:00:00.000Z",
    "record_id": 1234567890,
    "processed_at": "2026-06-26T08:00:01.234Z"
  }
}
```

**Batch Payload:**
```json
{
  "status": "success",
  "message": "Batch telemetry data received",
  "data": {
    "device_id": "DEV-TRK-001",
    "records_received": 3,
    "records_inserted": 3,
    "records_failed": 0,
    "processed_at": "2026-06-26T08:02:01.456Z"
  }
}
```

---

### Error Responses

#### 400 Bad Request - Invalid Payload
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "weight_kg",
        "issue": "must be a positive integer"
      },
      {
        "field": "latitude",
        "issue": "must be between -90 and 90"
      }
    ]
  }
}
```

#### 401 Unauthorized - Missing/Invalid Authentication
```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication credentials"
  }
}
```

#### 403 Forbidden - Device Not Authorized
```json
{
  "status": "error",
  "error": {
    "code": "DEVICE_NOT_AUTHORIZED",
    "message": "Device 'DEV-TRK-001' is not authorized or inactive"
  }
}
```

#### 404 Not Found - Device Not Registered
```json
{
  "status": "error",
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device 'DEV-TRK-001' not found in registry"
  }
}
```

#### 413 Payload Too Large
```json
{
  "status": "error",
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Batch size exceeds maximum limit of 100 readings"
  }
}
```

#### 422 Unprocessable Entity - Validation Error
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Telemetry data validation failed",
    "details": [
      {
        "field": "timestamp",
        "issue": "timestamp cannot be in the future"
      }
    ]
  }
}
```

#### 429 Too Many Requests - Rate Limit Exceeded
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 100 requests per minute per device",
    "retry_after": 30
  }
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred while processing your request",
    "request_id": "req_abc123xyz"
  }
}
```

#### 503 Service Unavailable
```json
{
  "status": "error",
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable. Please retry.",
    "retry_after": 60
  }
}
```

---

## 2. Device Health Check API

### Endpoint: POST /devices/{device_id}/heartbeat

**Description:** Send periodic heartbeat to update device status and last_seen_at timestamp.

### Request Format
```json
{
  "timestamp": "2026-06-26T08:00:00.000Z",
  "status": "active",
  "firmware_version": "v2.3.1",
  "battery_level": 85.5
}
```

### Response Format (200 OK)
```json
{
  "status": "success",
  "message": "Heartbeat received",
  "data": {
    "device_id": "DEV-TRK-001",
    "server_time": "2026-06-26T08:00:01.234Z",
    "config_updated": false
  }
}
```

---

## 3. Device Configuration Sync API

### Endpoint: GET /devices/{device_id}/config

**Description:** Retrieve current device configuration from server.

### Response Format (200 OK)
```json
{
  "status": "success",
  "data": {
    "device_id": "DEV-TRK-001",
    "load_limit_kg": 15000,
    "throttle_enabled": true,
    "fuel_capacity_liters": 400.0,
    "reporting_interval_seconds": 60,
    "updated_at": "2026-06-20T10:30:00.000Z"
  }
}
```

---

## Implementation Guidelines

### 1. Edge Device Implementation

**Recommended Flow:**
1. Device collects telemetry data every minute
2. Buffer readings locally (up to 10-15 readings)
3. Send batch payload every 10-15 minutes to reduce network overhead
4. Implement exponential backoff retry logic for failed requests
5. Store failed payloads locally and retry when connection restored

**Example Retry Logic:**
```
Attempt 1: Immediate
Attempt 2: Wait 5 seconds
Attempt 3: Wait 15 seconds
Attempt 4: Wait 45 seconds
Attempt 5: Wait 2 minutes
```

### 2. Network Optimization

- **Compression:** Use gzip compression for batch payloads
- **Connection Reuse:** Maintain persistent HTTP connections
- **Batch Size:** Optimal batch size is 10-20 readings per request
- **Timeout:** Set request timeout to 30 seconds

### 3. Data Validation (Client-Side)

Before sending, validate:
- Timestamp is not in the future
- GPS coordinates are within valid ranges
- Weight is non-negative
- Speed is non-negative (if provided)
- Device ID matches registered ID

### 4. Security Best Practices

- Store API keys/tokens securely (encrypted storage)
- Use HTTPS/TLS 1.3 for all communications
- Implement certificate pinning for production
- Rotate API keys periodically (every 90 days)
- Never log sensitive credentials

### 5. Error Handling

- **4xx errors:** Log and alert (configuration issue)
- **5xx errors:** Retry with exponential backoff
- **Network errors:** Queue locally and retry
- **Validation errors:** Log for debugging, don't retry

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /telemetry (single) | 100 requests | per minute per device |
| POST /telemetry (batch) | 20 requests | per minute per device |
| POST /devices/{id}/heartbeat | 10 requests | per minute per device |
| GET /devices/{id}/config | 5 requests | per minute per device |

---

## Example cURL Commands

### Single Telemetry Submission
```bash
curl -X POST https://api.yourplatform.com/v1/telemetry \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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

### Batch Telemetry Submission
```bash
curl -X POST https://api.yourplatform.com/v1/telemetry \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Content-Encoding: gzip" \
  --data-binary @telemetry_batch.json.gz
```

### Device Heartbeat
```bash
curl -X POST https://api.yourplatform.com/v1/devices/DEV-TRK-001/heartbeat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-06-26T08:00:00.000Z",
    "status": "active",
    "firmware_version": "v2.3.1",
    "battery_level": 85.5
  }'
```

### Get Device Configuration
```bash
curl -X GET https://api.yourplatform.com/v1/devices/DEV-TRK-001/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-26 | Initial API contract definition |

---

## Support

For API support and questions:
- Email: api-support@yourplatform.com
- Documentation: https://docs.yourplatform.com
- Status Page: https://status.yourplatform.com
