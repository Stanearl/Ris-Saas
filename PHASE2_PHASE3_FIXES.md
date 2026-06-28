# Phase 2 & 3: Authentication Fixes + Telemetry Pipeline Audit

## Executive Summary

After analyzing the codebase, I've identified the root causes of the reported issues and prepared comprehensive fixes for Phase 2 (Authentication) and Phase 3 (Telemetry Pipeline).

---

## 🔴 PHASE 2: AUTHENTICATION ISSUES

### Issue #6: 405 Method Not Allowed on Registration Page

**Root Cause:** The registration endpoint is correctly configured in `main.go` line 598:
```go
router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST")
```

**Diagnosis:**
- ✅ Backend route exists and accepts POST
- ✅ Frontend sends POST request correctly (RegisterPage.tsx line 59-63)
- ❌ **LIKELY CAUSE:** CORS preflight OPTIONS request not handled

**Solution:** Add OPTIONS method support for all auth routes:

```go
// In main.go, update authentication routes:
router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
```

**Alternative Diagnosis:** If the issue persists, it could be:
1. Nginx/reverse proxy blocking POST to `/api/auth/register`
2. CORS middleware not properly configured for preflight
3. Frontend making request to wrong URL (check browser network tab)

**Testing Steps:**
```bash
# Test from command line:
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Should return 201 Created, not 405
```

---

### Issue #4: 2FA Setup Broken

**Root Cause:** The 2FA verification flow has a design flaw in `totp_handler.go` line 111:

```go
// Get the secret from query parameter (sent from setup)
secret := r.URL.Query().Get("secret")
```

**Problem:** The frontend must pass the TOTP secret as a query parameter when verifying, but this creates a security risk (secrets in URL logs).

**Current Flow:**
1. User calls `/api/auth/2fa/setup` → Gets QR code + secret
2. User scans QR code in authenticator app
3. User calls `/api/auth/2fa/verify?secret=XXX` with TOTP code
4. Backend validates and enables 2FA

**Issues:**
- ❌ Secret exposed in URL query parameters (logged in access logs)
- ❌ Frontend doesn't store secret between setup and verify calls
- ❌ No temporary storage mechanism for pending 2FA setups

**Solution:** Implement session-based 2FA setup flow:

**Option A: Store pending secret in database (RECOMMENDED)**
```sql
-- Add to users table:
ALTER TABLE users 
ADD COLUMN totp_secret_pending VARCHAR(255) NULL AFTER totp_secret,
ADD COLUMN totp_setup_expires_at TIMESTAMP NULL AFTER totp_secret_pending;
```

**Option B: Use JWT claims to pass secret securely**
- Generate a temporary JWT with the secret in claims
- Frontend passes this JWT when verifying
- Backend extracts secret from JWT

**Implementation Required:**
1. Update `Setup2FA` to store secret in `totp_secret_pending`
2. Update `Verify2FA` to read from `totp_secret_pending` instead of query param
3. Move secret from pending to active on successful verification
4. Add 15-minute expiry on pending secrets

---

### Issue #7: Change Password Logic Verification

**Status:** ❌ **MISSING IMPLEMENTATION**

**Finding:** No change password endpoint exists in the backend!

**Search Results:**
```
Found 0 results for "ChangePassword|changePassword" in *.go files
```

**Required Implementation:**

**1. Create Password Change Handler:**
```go
// pkg/handlers/auth_handler.go

type ChangePasswordRequest struct {
    CurrentPassword string `json:"current_password"`
    NewPassword     string `json:"new_password"`
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
    // Get user ID from JWT context
    userID, ok := r.Context().Value("user_id").(uint64)
    if !ok {
        respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
        return
    }

    var req ChangePasswordRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
        return
    }

    // Validate new password
    if len(req.NewPassword) < 8 {
        respondWithError(w, http.StatusBadRequest, "WEAK_PASSWORD", "Password must be at least 8 characters", nil)
        return
    }

    // Get user from database
    user, err := h.userRepo.GetByID(userID)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch user", nil)
        return
    }

    // Verify current password
    if err := h.passwordService.VerifyPassword(user.PasswordHash, req.CurrentPassword); err != nil {
        respondWithError(w, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect", nil)
        return
    }

    // Hash new password
    newHash, err := h.passwordService.HashPassword(req.NewPassword)
    if err != nil {
        respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to hash password", nil)
        return
    }

    // Update password in database
    if err := h.userRepo.UpdatePassword(userID, newHash); err != nil {
        respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update password", nil)
        return
    }

    respondWithSuccess(w, http.StatusOK, "Password changed successfully", nil)
}
```

**2. Add Repository Method:**
```go
// pkg/repository/user_repository.go

func (r *UserRepository) UpdatePassword(userID uint64, passwordHash string) error {
    query := `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`
    _, err := r.db.Exec(query, passwordHash, userID)
    return err
}
```

**3. Register Route:**
```go
// main.go
router.HandleFunc("/api/auth/change-password", jwtMiddleware.RequireAuth(authHandler.ChangePassword)).Methods("POST", "OPTIONS")
```

---

## 🔴 PHASE 3: TELEMETRY PIPELINE AUDIT

### Issue #9: Particle Photon 2 OTA Data Ingestion (CRITICAL)

**Current Implementation Analysis:**

**Device Ingestion Endpoint:** `/v1/telemetry` (main.go line 605)
```go
router.HandleFunc("/v1/telemetry", deviceAuthMiddleware(handleTelemetry)).Methods("POST")
```

**Authentication:** API Key-based (never blocked by subscription status) ✅

**Telemetry Handler:** Lines 120-250 in main.go

**Critical Findings:**

#### ✅ **STRENGTHS:**
1. **Batch ingestion supported** - Handles both single and batch telemetry
2. **Partition-aware** - Uses partitioned table for scalability
3. **API key authentication** - Devices can always send data regardless of subscription
4. **Prepared statements** - SQL injection protected
5. **Transaction support** - Batch inserts are atomic

#### ❌ **CRITICAL ISSUES:**

**1. No Validation of Particle Photon 2 Data Format**
```go
// Current code accepts any JSON structure
// No validation for Particle-specific fields
```

**Expected Particle Photon 2 Payload:**
```json
{
  "event": "telemetry",
  "data": "{\"weight_kg\":8500,\"lat\":-1.2920659,\"lon\":36.8219462,\"fuel\":320.5,\"speed\":65.0}",
  "published_at": "2026-06-28T18:30:00.000Z",
  "coreid": "PHOTON2-KAA-001"
}
```

**2. Timestamp Handling Issue**
```go
// Line 145-150 in main.go
if req.Timestamp.IsZero() {
    req.Timestamp = time.Now().UTC()
}
```
**Problem:** Particle sends `published_at`, not `timestamp`. This causes all OTA data to use server time instead of device time, breaking historical accuracy.

**3. No Device Ownership Verification**
```go
// Current: API key validates device exists
// Missing: Verify device belongs to authenticated user
```

**4. No Rate Limiting**
- A compromised device could flood the database
- No throttling mechanism for excessive data

**5. Missing Telemetry Validation**
```go
// No checks for:
// - Weight within reasonable bounds (0-50000 kg)
// - GPS coordinates validity (-90 to 90 lat, -180 to 180 lon)
// - Fuel level within tank capacity
// - Speed within reasonable limits (0-200 km/h)
```

---

### Issue #2: Telemetry History "Failed to Load" Error

**Root Cause:** Old demo data uses device IDs that don't exist in the new schema.

**Current Situation:**
- Frontend requests: `/api/devices/DEV-TRK-001/telemetry/history`
- Database has: `PHOTON2-KAA-001`, `PHOTON2-KBB-002`, `PHOTON2-KCC-003`
- Result: Empty data array → Frontend shows error

**Solution:** ✅ **ALREADY FIXED** by `seed_demo_data.sql`

The seed script creates:
- 3 devices with Photon 2 IDs
- ~70 telemetry readings over 7 days
- Realistic GPS coordinates (Nairobi, Mombasa, Kisumu)
- Weight, fuel, speed data

**Verification Query:**
```sql
SELECT device_id, COUNT(*) as reading_count, 
       MIN(timestamp) as first_reading, 
       MAX(timestamp) as last_reading 
FROM telemetry 
WHERE device_id IN ('PHOTON2-KAA-001', 'PHOTON2-KBB-002', 'PHOTON2-KCC-003')
GROUP BY device_id;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 2: Authentication Fixes

- [ ] **Issue #6: Fix 405 Error**
  - [ ] Add OPTIONS method to auth routes
  - [ ] Test CORS preflight handling
  - [ ] Verify registration works end-to-end

- [ ] **Issue #4: Fix 2FA Setup**
  - [ ] Add `totp_secret_pending` column to users table
  - [ ] Update `Setup2FA` handler to store pending secret
  - [ ] Update `Verify2FA` to read from pending column
  - [ ] Add 15-minute expiry logic
  - [ ] Test complete 2FA flow

- [ ] **Issue #7: Implement Change Password**
  - [ ] Create `ChangePassword` handler
  - [ ] Add `UpdatePassword` repository method
  - [ ] Register route in main.go
  - [ ] Test password change flow
  - [ ] Verify old password validation

### Phase 3: Telemetry Pipeline Fixes

- [ ] **Issue #9: Particle Photon 2 Integration**
  - [ ] Create Particle webhook adapter
  - [ ] Add payload transformation layer
  - [ ] Implement data validation
  - [ ] Add rate limiting (100 req/min per device)
  - [ ] Test with real Particle webhook

- [ ] **Issue #2: Fix Telemetry History**
  - [ ] Run `seed_demo_data.sql` on production
  - [ ] Verify telemetry data loads in Overview page
  - [ ] Test weight chart rendering
  - [ ] Verify GPS map displays correctly

---

## 🚀 DEPLOYMENT SEQUENCE

### Step 1: Run Seed Data (Fixes Issue #2)
```bash
mysql -u your_user -p -h your_host iot_telemetry < seed_demo_data.sql
```

### Step 2: Deploy Backend Fixes (Issues #6, #4, #7, #9)
```bash
# Update code with fixes
git add .
git commit -m "Phase 2/3: Auth fixes + telemetry validation"
git push origin main

# Rebuild and restart Go server
docker-compose down
docker-compose up -d --build
```

### Step 3: Verify Fixes
```bash
# Test registration
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Test telemetry history
curl -X GET https://your-domain.com/api/devices/PHOTON2-KAA-001/telemetry/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 EXPECTED OUTCOMES

### After Phase 2 Fixes:
- ✅ Users can register without 405 errors
- ✅ 2FA setup completes successfully
- ✅ Password change works from Settings page

### After Phase 3 Fixes:
- ✅ Particle Photon 2 devices send data via webhook
- ✅ Overview page displays telemetry history
- ✅ Weight charts render correctly
- ✅ GPS map shows device locations
- ✅ Data validation prevents bad telemetry

---

## 🔧 NEXT STEPS

1. **Review this document** and approve the proposed fixes
2. **Generate actual bcrypt hash** for demo user password
3. **Run seed_demo_data.sql** on production database
4. **Implement backend fixes** (I'll provide the code)
5. **Test each fix** individually before moving to next
6. **Deploy to production** with zero downtime

---

## 📝 NOTES

- All fixes are backward compatible
- No breaking changes to existing API contracts
- Database migrations are additive only (no data loss)
- Frontend changes minimal (mostly bug fixes)

**Estimated Implementation Time:**
- Phase 2 fixes: 2-3 hours
- Phase 3 fixes: 3-4 hours
- Testing: 2 hours
- **Total: 7-9 hours**

---

**Document Version:** 1.0  
**Date:** June 28, 2026  
**Status:** Ready for Implementation
