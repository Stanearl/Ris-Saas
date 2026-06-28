# Phase 1: Architecture & Data Model Pivot - Analysis & Implementation Plan

## Current Architecture Issues

### Issue 10: Per-Device Billing Model
**Current State:**
- Database schema has `users` table with account-level subscription fields:
  - `subscription_status` (active/past_due/canceled)
  - `subscription_expires_at`
  - `paystack_customer_code`
  - `paystack_subscription_code`
- JWT tokens contain user-level `subscription_status`
- Middleware checks user-level subscription status
- Devices table has `user_id` foreign key but no subscription fields

**Problem:**
- Business model is **$ per truck/month**, not per account
- If a user has 3 trucks, they should have 3 separate device subscriptions
- Access to device data should depend on that specific device's payment status
- Current architecture blocks ALL devices if account subscription lapses

**Required Changes:**

1. **Database Schema Migration:**
   ```sql
   -- Add per-device subscription fields
   ALTER TABLE devices 
   ADD COLUMN subscription_status ENUM('active', 'past_due', 'canceled', 'trial') NOT NULL DEFAULT 'trial',
   ADD COLUMN paystack_subscription_code VARCHAR(100) NULL,
   ADD COLUMN subscription_expires_at TIMESTAMP NULL,
   ADD COLUMN monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
   ADD INDEX idx_subscription_status (subscription_status),
   ADD INDEX idx_paystack_subscription (paystack_subscription_code);
   
   -- Create device_subscriptions table for tracking
   CREATE TABLE device_subscriptions (
       id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
       device_id VARCHAR(50) NOT NULL,
       user_id BIGINT UNSIGNED NOT NULL,
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
           ON DELETE CASCADE,
       CONSTRAINT fk_device_subscriptions_user 
           FOREIGN KEY (user_id) 
           REFERENCES users(id)
           ON DELETE CASCADE
   );
   ```

2. **Update Device Model (pkg/models/device.go):**
   ```go
   type Device struct {
       DeviceID                 string     `json:"device_id"`
       UserID                   *uint64    `json:"user_id,omitempty"`
       DeviceName               string     `json:"device_name"`
       HardwareTier             int        `json:"hardware_tier"`
       TruckRegistration        string     `json:"truck_registration"`
       Industry                 string     `json:"industry"`
       LoadLimitKg              int        `json:"load_limit_kg"`
       ThrottleEnabled          bool       `json:"throttle_enabled"`
       FuelCapacityLiters       float64    `json:"fuel_capacity_liters"`
       Status                   string     `json:"status"`
       SubscriptionStatus       string     `json:"subscription_status"`        // NEW
       PaystackSubscriptionCode *string    `json:"paystack_subscription_code,omitempty"` // NEW
       SubscriptionExpiresAt    *time.Time `json:"subscription_expires_at,omitempty"`    // NEW
       MonthlyPrice             float64    `json:"monthly_price"`              // NEW
       APIKey                   *string    `json:"api_key,omitempty"`
       CreatedAt                time.Time  `json:"created_at"`
       UpdatedAt                time.Time  `json:"updated_at"`
       LastSeenAt               *time.Time `json:"last_seen_at,omitempty"`
   }
   ```

3. **Update Middleware Logic:**
   - Change `RequireActiveSubscription` to check device-level subscription
   - Accept `device_id` as parameter
   - Query device subscription status from database
   - Return 402 if specific device subscription is not active

4. **Update Paystack Webhook Handler:**
   - Parse `device_id` from webhook metadata
   - Update specific device subscription status
   - Log events to `device_subscriptions` table

5. **Update JWT Claims (Optional):**
   - Remove user-level `subscription_status` from JWT
   - OR keep it for backward compatibility but don't enforce it

---

### Issue 8: Dynamic ACTIVE Badge
**Current State:**
- TopBar.tsx has hardcoded "ACTIVE" badge with green pulse animation
- Badge is purely decorative, doesn't reflect actual status
- No API call to fetch subscription status

**Required Changes:**

1. **Create Fleet Status API Endpoint:**
   ```go
   // GET /api/fleet/status
   // Returns aggregate status of user's fleet
   type FleetStatusResponse struct {
       TotalDevices    int    `json:"total_devices"`
       ActiveDevices   int    `json:"active_devices"`
       PastDueDevices  int    `json:"past_due_devices"`
       CanceledDevices int    `json:"canceled_devices"`
       OverallStatus   string `json:"overall_status"` // "active", "partial", "inactive"
   }
   ```

2. **Update TopBar Component:**
   ```typescript
   // Fetch fleet status on mount
   const { data: fleetStatus } = useQuery({
       queryKey: ['fleet-status'],
       queryFn: () => api.get('/api/fleet/status'),
       refetchInterval: 60000 // Refresh every minute
   });
   
   // Dynamic badge rendering
   const getBadgeVariant = () => {
       if (fleetStatus.overall_status === 'active') return 'success';
       if (fleetStatus.overall_status === 'partial') return 'warning';
       return 'destructive';
   };
   ```

3. **Badge States:**
   - **ALL ACTIVE** (green): All devices have active subscriptions
   - **PARTIAL** (yellow): Some devices active, some past_due/canceled
   - **INACTIVE** (red): No active device subscriptions

---

### Issue 3: Wire Up Settings Page
**Current State:**
- "Manage Subscription" button has no onClick handler
- Notification toggles are uncontrolled (no state persistence)
- No backend API for notification preferences

**Required Changes:**

1. **Create Notification Preferences Table:**
   ```sql
   CREATE TABLE user_notification_preferences (
       user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
       weight_limit_alerts BOOLEAN NOT NULL DEFAULT TRUE,
       device_offline_alerts BOOLEAN NOT NULL DEFAULT TRUE,
       weekly_reports BOOLEAN NOT NULL DEFAULT FALSE,
       email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
       sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       
       CONSTRAINT fk_notification_prefs_user 
           FOREIGN KEY (user_id) 
           REFERENCES users(id)
           ON DELETE CASCADE
   );
   ```

2. **Create Notification Preferences API:**
   ```go
   // GET /api/user/notification-preferences
   // PUT /api/user/notification-preferences
   type NotificationPreferences struct {
       WeightLimitAlerts    bool `json:"weight_limit_alerts"`
       DeviceOfflineAlerts  bool `json:"device_offline_alerts"`
       WeeklyReports        bool `json:"weekly_reports"`
       EmailNotifications   bool `json:"email_notifications"`
       SMSNotifications     bool `json:"sms_notifications"`
   }
   ```

3. **Manage Subscription Button Logic:**
   ```typescript
   const handleManageSubscription = () => {
       // Option 1: Redirect to Paystack customer portal
       window.location.href = `https://paystack.com/manage/${paystackCustomerCode}`;
       
       // Option 2: Open modal with device subscription list
       // Show each device with its subscription status
       // Allow user to subscribe/cancel individual devices
   };
   ```

4. **Update SettingsPage.tsx:**
   - Fetch notification preferences on mount
   - Make toggles controlled components
   - Save preferences on change with debouncing
   - Show loading/success states

---

## Implementation Order

### Step 1: Database Migration (30 min)
1. Create `schema_per_device_billing.sql`
2. Add device subscription fields to devices table
3. Create device_subscriptions table
4. Create user_notification_preferences table
5. Test migration on local database

### Step 2: Update Backend Models & Repositories (45 min)
1. Update Device model with subscription fields
2. Create DeviceSubscription model
3. Create NotificationPreferences model
4. Update DeviceRepository with subscription queries
5. Create NotificationPreferencesRepository

### Step 3: Update Middleware & JWT (30 min)
1. Create new middleware: `RequireDeviceSubscription(deviceID)`
2. Update existing routes to use device-level checks
3. Keep user-level subscription for backward compatibility

### Step 4: Create New API Endpoints (60 min)
1. `GET /api/fleet/status` - Aggregate fleet subscription status
2. `GET /api/user/notification-preferences` - Get preferences
3. `PUT /api/user/notification-preferences` - Update preferences
4. `GET /api/devices/{device_id}/subscription` - Get device subscription details
5. `POST /api/devices/{device_id}/subscribe` - Initiate Paystack subscription for device

### Step 5: Update Paystack Webhook (30 min)
1. Parse device_id from webhook metadata
2. Update device-level subscription status
3. Log to device_subscriptions table
4. Keep user-level updates for backward compatibility

### Step 6: Update Frontend (60 min)
1. Update TopBar with dynamic badge
2. Create useFleetStatus hook
3. Update SettingsPage with notification preferences
4. Wire up Manage Subscription button
5. Add device subscription management UI

### Step 7: Testing (45 min)
1. Test device registration with subscription
2. Test Paystack webhook with device_id
3. Test fleet status aggregation
4. Test notification preferences CRUD
5. Test 402 errors for unpaid devices

---

## Migration Strategy

### Backward Compatibility
- Keep user-level subscription fields for existing integrations
- Gradually migrate existing devices to per-device subscriptions
- Support both models during transition period

### Data Migration Script
```sql
-- Migrate existing user subscriptions to device subscriptions
INSERT INTO device_subscriptions (device_id, user_id, paystack_subscription_code, status, amount, currency)
SELECT 
    d.device_id,
    d.user_id,
    u.paystack_subscription_code,
    u.subscription_status,
    5000.00, -- Default price per device
    'NGN'
FROM devices d
INNER JOIN users u ON d.user_id = u.id
WHERE u.paystack_subscription_code IS NOT NULL;

-- Update device subscription fields
UPDATE devices d
INNER JOIN users u ON d.user_id = u.id
SET 
    d.subscription_status = u.subscription_status,
    d.subscription_expires_at = u.subscription_expires_at,
    d.paystack_subscription_code = u.paystack_subscription_code,
    d.monthly_price = 5000.00;
```

---

## Success Criteria

✅ **Issue 10 Resolved:**
- Each device has its own subscription status
- Users can view/pay for devices individually
- Access to device data depends on device subscription, not account subscription

✅ **Issue 8 Resolved:**
- ACTIVE badge reflects real-time fleet status
- Badge updates automatically
- Shows aggregate status (all active, partial, inactive)

✅ **Issue 3 Resolved:**
- Manage Subscription button functional
- Notification preferences save to database
- Toggles reflect actual saved state

---

## Next Steps After Phase 1
Once Phase 1 is complete and tested, proceed to:
- **Phase 2:** Authentication & Security (Issues 6, 4, 7)
- **Phase 3:** Telemetry Core (Issues 9, 2)
- **Phase 4:** UI/UX Polish (Issues 1, 5)
