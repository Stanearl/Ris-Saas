package models

import (
	"time"
)

// NotificationPreferences represents user notification settings
type NotificationPreferences struct {
	UserID              uint64    `json:"user_id"`
	WeightLimitAlerts   bool      `json:"weight_limit_alerts"`
	DeviceOfflineAlerts bool      `json:"device_offline_alerts"`
	WeeklyReports       bool      `json:"weekly_reports"`
	EmailNotifications  bool      `json:"email_notifications"`
	SMSNotifications    bool      `json:"sms_notifications"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
