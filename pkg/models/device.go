package models

import (
	"time"
)

// Device represents a hardware device/truck
type Device struct {
	DeviceID                 string     `json:"device_id"`
	UserID                   *uint64    `json:"user_id,omitempty"`
	DeviceName               string     `json:"device_name"`
	HardwareTier             int        `json:"hardware_tier"` // 1, 2, or 3
	TruckRegistration        string     `json:"truck_registration"`
	Industry                 string     `json:"industry"`
	LoadLimitKg              int        `json:"load_limit_kg"`
	ThrottleEnabled          bool       `json:"throttle_enabled"`
	FuelCapacityLiters       float64    `json:"fuel_capacity_liters"`
	Status                   string     `json:"status"`
	SubscriptionStatus       string     `json:"subscription_status"`                  // Per-device subscription status
	PaystackSubscriptionCode *string    `json:"paystack_subscription_code,omitempty"` // Per-device Paystack subscription
	SubscriptionExpiresAt    *time.Time `json:"subscription_expires_at,omitempty"`    // Per-device expiry
	MonthlyPrice             float64    `json:"monthly_price"`                        // Price for this device
	APIKey                   *string    `json:"api_key,omitempty"`                    // Only returned on registration
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
	LastSeenAt               *time.Time `json:"last_seen_at,omitempty"`
}

// Device status constants
const (
	DeviceStatusActive      = "active"
	DeviceStatusInactive    = "inactive"
	DeviceStatusMaintenance = "maintenance"
)

// Device subscription status constants
const (
	DeviceSubscriptionActive   = "active"
	DeviceSubscriptionPastDue  = "past_due"
	DeviceSubscriptionCanceled = "canceled"
	DeviceSubscriptionTrial    = "trial"
)

// Industry constants
const (
	IndustryAgriculture  = "agriculture"
	IndustryLogistics    = "logistics"
	IndustryMining       = "mining"
	IndustryConstruction = "construction"
	IndustryOther        = "other"
)

// DeviceSubscription represents a device's subscription record
type DeviceSubscription struct {
	ID                       uint64     `json:"id"`
	DeviceID                 string     `json:"device_id"`
	UserID                   string     `json:"user_id"` // String to match VARCHAR in DB (from JWT context)
	PaystackSubscriptionCode string     `json:"paystack_subscription_code"`
	PaystackPlanCode         string     `json:"paystack_plan_code"`
	Amount                   float64    `json:"amount"`
	Currency                 string     `json:"currency"`
	Status                   string     `json:"status"`
	NextPaymentDate          *time.Time `json:"next_payment_date,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

// FleetStatus represents aggregate fleet subscription status
type FleetStatus struct {
	TotalDevices     int     `json:"total_devices"`
	ActiveDevices    int     `json:"active_devices"`
	PastDueDevices   int     `json:"past_due_devices"`
	CanceledDevices  int     `json:"canceled_devices"`
	TrialDevices     int     `json:"trial_devices"`
	TotalMonthlyCost float64 `json:"total_monthly_cost"`
	OverallStatus    string  `json:"overall_status"` // "all_active", "partial", "inactive"
}
