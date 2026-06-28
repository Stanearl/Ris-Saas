package models

import (
	"time"
)

// Device represents a hardware device/truck
type Device struct {
	DeviceID           string     `json:"device_id"`
	UserID             *uint64    `json:"user_id,omitempty"`
	DeviceName         string     `json:"device_name"`
	HardwareTier       int        `json:"hardware_tier"` // 1, 2, or 3
	TruckRegistration  string     `json:"truck_registration"`
	Industry           string     `json:"industry"`
	LoadLimitKg        int        `json:"load_limit_kg"`
	ThrottleEnabled    bool       `json:"throttle_enabled"`
	FuelCapacityLiters float64    `json:"fuel_capacity_liters"`
	Status             string     `json:"status"`
	APIKey             *string    `json:"api_key,omitempty"` // Only returned on registration
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	LastSeenAt         *time.Time `json:"last_seen_at,omitempty"`
}

// Device status constants
const (
	DeviceStatusActive      = "active"
	DeviceStatusInactive    = "inactive"
	DeviceStatusMaintenance = "maintenance"
)

// Industry constants
const (
	IndustryAgriculture  = "agriculture"
	IndustryLogistics    = "logistics"
	IndustryMining       = "mining"
	IndustryConstruction = "construction"
	IndustryOther        = "other"
)
