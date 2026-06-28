# Quick Start Guide - JWT Auth & Paystack Integration

## Prerequisites

- Go 1.21 or higher
- MySQL 8.0 or higher
- Paystack account (for subscription management)

## Installation Steps

### 1. Install Dependencies

```bash
go mod tidy
```

### 2. Setup Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE iot_telemetry;"

# Run base schema
mysql -u root -p iot_telemetry < schema.sql

# Run authentication schema
mysql -u root -p iot_telemetry < schema_auth.sql
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# IMPORTANT: Change these values!
# - JWT_SECRET_KEY: Use a strong random string
# - PAYSTACK_SECRET_KEY: Your Paystack secret key
# - DB_PASSWORD: Your MySQL password
```

### 4. Build and Run

```bash
# Build the application
go build -o iot-telemetry-platform

# Run the server
./iot-telemetry-platform
```

Or on Windows:
```bash
go build -o iot-telemetry-platform.exe
.\iot-telemetry-platform.exe
```

## Testing the Implementation

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "test@example.com",
      "full_name": "Test User",
      "subscription_status": "canceled"
    }
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Test Protected Endpoint (Will Fail - No Active Subscription)

```bash
# Save the token from login response
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/devices/DEV-TRK-001/live \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (402 Payment Required):**
```json
{
  "status": "error",
  "error": {
    "code": "SUBSCRIPTION_REQUIRED",
    "message": "Active subscription required to access this resource. Please update your payment method."
  }
}
```

### 4. Simulate Successful Payment (Manual Database Update)

```sql
-- Update user subscription status to active
UPDATE users 
SET subscription_status = 'active',
    subscription_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE email = 'test@example.com';
```

### 5. Test Protected Endpoint Again (Should Work)

```bash
# Login again to get new token with updated subscription status
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Use new token
TOKEN="new_jwt_token_here"

curl -X GET http://localhost:8080/api/devices/DEV-TRK-001/live \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Live device data",
  "data": {
    "device_id": "DEV-TRK-001",
    "reading": {
      "timestamp": "2026-06-26T20:00:00Z",
      "weight_kg": 8500,
      "latitude": -1.2920659,
      "longitude": 36.8219462
    }
  }
}
```

### 6. Test Device Ingestion (Always Works)

```bash
# Device ingestion works regardless of subscription status
curl -X POST http://localhost:8080/v1/telemetry \
  -H "X-API-Key: test_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "DEV-TRK-001",
    "timestamp": "2026-06-26T20:00:00Z",
    "weight_kg": 8500,
    "latitude": -1.2920659,
    "longitude": 36.8219462,
    "fuel_level_liters": 320.5,
    "speed_kmh": 65.0,
    "ecu_throttle_active": true
  }'
```

## Paystack Webhook Setup

### 1. Configure Webhook URL in Paystack Dashboard

```
https://your-domain.com/api/webhooks/paystack
```

### 2. Test Webhook Locally with ngrok

```bash
# Install ngrok (if not already installed)
# Download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 8080

# Use the ngrok URL in Paystack dashboard
https://abc123.ngrok.io/api/webhooks/paystack
```

### 3. Test Webhook Events

Paystack will send webhooks for these events:
- `charge.success` → Sets subscription to `active`
- `invoice.payment_failed` → Sets subscription to `past_due`
- `subscription.create` → Logs subscription creation
- `subscription.disable` → Sets subscription to `canceled`

## API Endpoints Summary

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/webhooks/paystack` - Paystack webhook receiver
- `GET /health` - Health check

### Device Endpoints (API Key Auth - Never Blocked)
- `POST /v1/telemetry` - Submit telemetry data
- `POST /v1/devices/{id}/heartbeat` - Device heartbeat
- `GET /v1/devices/{id}/config` - Get device config

### Protected Endpoints (JWT + Active Subscription Required)
- `GET /api/devices/{id}/live` - Get live device data

## Environment Variables Reference

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=iot_telemetry

# Server
SERVER_PORT=8080

# JWT
JWT_SECRET_KEY=change_this_to_a_strong_random_string
JWT_ISSUER=iot-telemetry-platform
JWT_EXPIRATION_HOURS=168

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
```

## Troubleshooting

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u root -p -e "SELECT 1;"

# Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'iot_telemetry';"
```

### JWT Token Issues
```bash
# Decode JWT token at https://jwt.io
# Check expiration time
# Verify secret key matches
```

### Subscription Status Issues
```sql
-- Check user subscription status
SELECT id, email, subscription_status, subscription_expires_at 
FROM users 
WHERE email = 'your@email.com';

-- View subscription events
SELECT * FROM subscription_events 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Paystack Webhook Issues
```bash
# Check webhook signature verification
# Ensure PAYSTACK_SECRET_KEY is correct
# Check server logs for webhook processing
```

## Production Deployment Checklist

- [ ] Change JWT_SECRET_KEY to a strong random value
- [ ] Use production Paystack secret key (sk_live_...)
- [ ] Enable HTTPS/TLS
- [ ] Set up proper database backups
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting
- [ ] Add email notifications for subscription events
- [ ] Set up log rotation
- [ ] Configure reverse proxy (nginx/caddy)
- [ ] Set up automated partition management
- [ ] Implement database connection pooling tuning
- [ ] Add health check monitoring
- [ ] Set up error tracking (Sentry, etc.)

## Next Steps

1. **Read Full Documentation:** See `AUTH_IMPLEMENTATION.md` for detailed API documentation
2. **Configure Paystack:** Set up your Paystack account and webhook
3. **Customize:** Modify subscription logic for your business needs
4. **Deploy:** Follow production deployment checklist
5. **Monitor:** Set up logging and monitoring

## Support

- **Documentation:** `AUTH_IMPLEMENTATION.md`
- **Database Schema:** `schema_auth.sql`
- **API Contract:** `api-contract.md`
- **Paystack Docs:** https://paystack.com/docs

---

**Version:** 1.0.0  
**Last Updated:** June 26, 2026
