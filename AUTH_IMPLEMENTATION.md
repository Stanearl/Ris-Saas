# JWT Authentication & Paystack Subscription Implementation

## Overview

This document describes the complete JWT authentication and Paystack subscription management system implemented for the IoT Telemetry Platform. The system follows "Everything Claude Code" standards with modular, interface-driven design.

## Architecture

### Key Components

1. **JWT Authentication** (`pkg/auth/`)
   - Token generation and validation
   - Password hashing with bcrypt (cost factor: 12)
   - Claims include: user_id, email, subscription_status

2. **User Management** (`pkg/repository/`)
   - User CRUD operations
   - Subscription status management
   - Paystack integration tracking

3. **Authentication Handlers** (`pkg/handlers/`)
   - Registration endpoint
   - Login endpoint
   - Paystack webhook processor

4. **JWT Middleware** (`pkg/middleware/`)
   - Token validation
   - Subscription status verification
   - Returns 402 Payment Required for inactive subscriptions

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    subscription_status ENUM('active', 'past_due', 'canceled') DEFAULT 'canceled',
    paystack_customer_code VARCHAR(100),
    paystack_subscription_code VARCHAR(100),
    subscription_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL
);
```

### Subscription Events Table
```sql
CREATE TABLE subscription_events (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    paystack_event_id VARCHAR(100),
    subscription_code VARCHAR(100),
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(50),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Devices Table Update
```sql
ALTER TABLE devices 
ADD COLUMN user_id BIGINT UNSIGNED NULL,
ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "subscription_status": "canceled",
      "created_at": "2026-06-26T21:00:00Z"
    }
  }
}
```

**Validation Rules:**
- Email: Required, valid format
- Password: Required, minimum 8 characters
- Full Name: Required

#### POST /api/auth/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "subscription_status": "active",
      "subscription_expires_at": "2026-07-26T21:00:00Z",
      "last_login_at": "2026-06-26T21:00:00Z"
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Protected Endpoints

#### GET /api/devices/{device_id}/live
Get live telemetry data for a device. **Requires active subscription.**

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Live device data",
  "data": {
    "device_id": "DEV-TRK-001",
    "reading": {
      "timestamp": "2026-06-26T20:59:00Z",
      "weight_kg": 8500,
      "latitude": -1.2920659,
      "longitude": 36.8219462,
      "fuel_level_liters": 320.5,
      "speed_kmh": 65.0,
      "ecu_throttle_active": true
    }
  }
}
```

**Error Response (402 Payment Required):**
```json
{
  "status": "error",
  "error": {
    "code": "SUBSCRIPTION_REQUIRED",
    "message": "Active subscription required to access this resource. Please update your payment method."
  }
}
```

### Paystack Webhook

#### POST /api/webhooks/paystack
Receive and process Paystack webhook events.

**Headers:**
```
X-Paystack-Signature: <HMAC_SHA512_SIGNATURE>
Content-Type: application/json
```

**Supported Events:**
- `charge.success` - Payment successful, activates subscription
- `invoice.payment_failed` - Payment failed, sets status to past_due
- `subscription.create` - New subscription created
- `subscription.disable` - Subscription canceled

**Example Payload (charge.success):**
```json
{
  "event": "charge.success",
  "data": {
    "id": "1234567890",
    "amount": 500000,
    "currency": "NGN",
    "customer": {
      "email": "user@example.com",
      "customer_code": "CUS_xxxxx"
    },
    "subscription": {
      "subscription_code": "SUB_xxxxx"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Webhook processed",
  "data": {
    "event": "charge.success",
    "processed": true,
    "timestamp": "2026-06-26T21:00:00Z"
  }
}
```

## Subscription Logic

### Status Flow

```
canceled → active (on successful payment)
active → past_due (on payment failure)
past_due → active (on successful retry)
active → canceled (on subscription disable)
```

### Access Control

| Subscription Status | Dashboard Access | Device Ingestion |
|---------------------|------------------|------------------|
| `active`            | ✅ Allowed       | ✅ Allowed       |
| `past_due`          | ❌ 402 Error     | ✅ Allowed       |
| `canceled`          | ❌ 402 Error     | ✅ Allowed       |

**Critical:** Device edge ingestion (`/v1/telemetry`) is **NEVER** blocked by subscription status. Only frontend dashboard access requires an active subscription.

## Security Features

### Password Security
- **Hashing:** bcrypt with cost factor 12
- **Validation:** Minimum 8 characters required
- **Storage:** Only hashed passwords stored, never plaintext

### JWT Security
- **Algorithm:** HS256 (HMAC-SHA256)
- **Expiration:** Configurable (default: 168 hours / 7 days)
- **Claims:** user_id, email, subscription_status, standard claims
- **Secret Key:** Environment variable (must be changed in production)

### Paystack Webhook Security
- **Signature Verification:** HMAC-SHA512 validation
- **Secret Key:** Paystack secret key from environment
- **Replay Protection:** Event IDs logged to prevent duplicates

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET_KEY=your_super_secret_jwt_key_change_this_in_production
JWT_ISSUER=iot-telemetry-platform
JWT_EXPIRATION_HOURS=168

# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key_here
```

## Code Structure

```
pkg/
├── auth/
│   ├── jwt.go           # JWT token generation & validation
│   └── password.go      # Password hashing & verification
├── handlers/
│   ├── auth_handler.go      # Login & registration handlers
│   ├── paystack_handler.go  # Webhook event processor
│   └── response.go          # Standard response helpers
├── middleware/
│   └── jwt_middleware.go    # JWT validation & subscription check
├── models/
│   └── user.go              # User & subscription models
└── repository/
    ├── user_repository.go         # User database operations
    └── subscription_repository.go # Event logging operations
```

## Usage Examples

### 1. Register a New User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123",
    "full_name": "John Doe"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 3. Access Protected Endpoint

```bash
# Save token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:8080/api/devices/DEV-TRK-001/live \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Device Ingestion (Always Works)

```bash
curl -X POST http://localhost:8080/v1/telemetry \
  -H "X-API-Key: device_api_key" \
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

## Testing Paystack Webhooks Locally

### Using ngrok

```bash
# Start ngrok tunnel
ngrok http 8080

# Configure webhook URL in Paystack dashboard
https://your-ngrok-url.ngrok.io/api/webhooks/paystack
```

### Manual Testing

```bash
# Generate test signature
echo -n '{"event":"charge.success","data":{...}}' | \
  openssl dgst -sha512 -hmac "your_paystack_secret_key" | \
  awk '{print $2}'

# Send test webhook
curl -X POST http://localhost:8080/api/webhooks/paystack \
  -H "X-Paystack-Signature: <generated_signature>" \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.success","data":{...}}'
```

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INVALID_TOKEN` | 401 | JWT token expired or invalid |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `SUBSCRIPTION_REQUIRED` | 402 | Active subscription needed |
| `USER_EXISTS` | 409 | Email already registered |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `INTERNAL_ERROR` | 500 | Server error |

## Best Practices

1. **Always use HTTPS in production**
2. **Rotate JWT secret keys periodically**
3. **Monitor subscription events for anomalies**
4. **Implement rate limiting on auth endpoints**
5. **Log all authentication attempts**
6. **Use strong, unique passwords**
7. **Implement password reset functionality**
8. **Add email verification for new accounts**
9. **Monitor failed payment attempts**
10. **Implement grace period for past_due subscriptions**

## Future Enhancements

- [ ] Password reset via email
- [ ] Email verification on registration
- [ ] Two-factor authentication (2FA)
- [ ] Refresh token mechanism
- [ ] Role-based access control (RBAC)
- [ ] API rate limiting per user
- [ ] Subscription plan tiers
- [ ] Usage-based billing integration
- [ ] Admin dashboard for user management
- [ ] Audit logging for all actions

## Support

For issues or questions:
- Check logs: `tail -f /var/log/iot-telemetry.log`
- Database queries: See `schema_auth.sql` for useful queries
- Paystack docs: https://paystack.com/docs/payments/webhooks
- JWT debugger: https://jwt.io

---

**Implementation Date:** June 26, 2026  
**Version:** 1.0.0  
**Author:** Everything Claude Code Standards
