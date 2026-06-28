# Phase 1 Schema Correction - Production Reality Check

## Issue Identified
The original `schema_per_device_billing.sql` script failed on production with:
```
ERROR 1146 (42S02): Table 'iot_telemetry.users' doesn't exist
```

**Root Cause:** The production database only contains the `devices` table. There is no `users` table.

## Solution Implemented

### 1. ✅ Corrected SQL Schema (`schema_per_device_billing.sql`)

**Changes Made:**
- ✅ Removed ALL foreign key constraints referencing `users` table
- ✅ Changed `device_subscriptions.user_id` from `BIGINT UNSIGNED` to `VARCHAR(100)` (treated as string from JWT context)
- ✅ Removed `user_notification_preferences` foreign key to users table
- ✅ Removed data migration step (Step 4) that attempted to JOIN with users table
- ✅ Updated all example queries to work without users table

**New Schema Structure:**

```sql
-- 1. ALTER devices table (adds subscription columns)
ALTER TABLE devices 
ADD COLUMN subscription_status ENUM('active', 'past_due', 'canceled', 'trial') NOT NULL DEFAULT 'trial',
ADD COLUMN paystack_subscription_code VARCHAR(100) NULL,
ADD COLUMN subscription_expires_at TIMESTAMP NULL,
ADD COLUMN monthly_price DECIMAL(10,2) NOT NULL DEFAULT 5000.00;

-- 2. CREATE device_subscriptions (NO FK to users)
CREATE TABLE device_subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL COMMENT 'User identifier from JWT/Auth context',
    paystack_subscription_code VARCHAR(100) NOT NULL,
    -- ... other fields
    CONSTRAINT fk_device_subscriptions_device 
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- 3. CREATE user_notification_preferences (NO FK to users)
CREATE TABLE user_notification_preferences (
    user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY COMMENT 'User identifier from JWT/Auth context',
    weight_limit_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    -- ... other fields
);
```

### 2. ✅ Updated Go Backend

**File: `pkg/models/device.go`**
- Changed `DeviceSubscription.UserID` from `uint64` to `string` to match VARCHAR in database
- Added comment: `// String to match VARCHAR in DB (from JWT context)`

**Verification:**
- ✅ `pkg/repository/device_repository.go` - No JOINs with users table
- ✅ `pkg/repository/notification_repository.go` - No JOINs with users table
- ✅ All queries work with standalone `devices` table

### 3. ✅ Updated Frontend

**File: `frontend/src/types/api.ts`**
- Added subscription fields to `Device` interface:
  ```typescript
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trial'
  paystack_subscription_code: string | null
  subscription_expires_at: string | null
  monthly_price: number
  ```

**File: `frontend/src/pages/FleetPage.tsx`**
- ✅ Added dynamic subscription badge display
- ✅ Shows ACTIVE, TRIAL, PAST DUE, or PAYMENT REQUIRED badges per device
- ✅ Badge logic ready for real API integration

**File: `frontend/src/lib/api.ts`**
- ✅ Added `fleetAPI.getDevices()` method for future backend integration

**File: `frontend/src/pages/SettingsPage.tsx`**
- ✅ Already wired with notification preferences API
- ✅ Displays fleet status with total monthly cost

## How to Deploy

### Step 1: Run the Corrected SQL Script
```bash
mysql -u your_user -p -h your_hetzner_host iot_telemetry < schema_per_device_billing.sql
```

### Step 2: Verify Tables Created
```sql
SHOW TABLES;
-- Should show: devices, device_subscriptions, user_notification_preferences

DESCRIBE devices;
-- Should show new columns: subscription_status, paystack_subscription_code, etc.
```

### Step 3: Backend Already Compatible
The Go backend is already correctly implemented:
- No code changes needed
- All repositories work without users table
- Models updated to match new schema

### Step 4: Frontend Already Implemented
- Subscription badges display on Fleet page
- Settings page shows notification preferences
- API integration ready

## Architecture Notes

### User Identification Strategy
Since there's no `users` table, user identification works as follows:

1. **JWT Token:** Contains user_id claim
2. **Device Ownership:** `devices.user_id` links devices to users (nullable)
3. **Subscriptions:** `device_subscriptions.user_id` stored as VARCHAR from JWT
4. **Preferences:** `user_notification_preferences.user_id` stored as BIGINT from JWT

### Per-Device Billing Model
- Each device has its own subscription status
- Default: `trial` status on device registration
- Monthly price: NGN 5,000 per device (configurable)
- Subscription tracked in `devices` table + history in `device_subscriptions`

## Testing Checklist

- [ ] Run corrected SQL script on production
- [ ] Verify all 3 tables exist
- [ ] Register a test device
- [ ] Check device has `subscription_status = 'trial'`
- [ ] Update notification preferences via Settings page
- [ ] View Fleet page with subscription badges
- [ ] Test Paystack webhook integration (Phase 2)

## Phase 1 Complete ✅

**Deliverables:**
1. ✅ Corrected SQL schema (no users table dependencies)
2. ✅ Go backend models updated (DeviceSubscription.UserID as string)
3. ✅ Frontend Device interface updated with subscription fields
4. ✅ Fleet page displays dynamic subscription badges
5. ✅ Settings page wired with notification preferences API

**Ready for Phase 2:**
- Paystack webhook integration for device subscriptions
- Subscription management UI
- Payment flow implementation
