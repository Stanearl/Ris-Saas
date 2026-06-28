package repository

import (
	"database/sql"
	"fmt"

	"iot-telemetry-platform/pkg/models"
)

// NotificationPreferencesRepository handles notification preferences operations
type NotificationPreferencesRepository interface {
	Get(userID uint64) (*models.NotificationPreferences, error)
	Update(prefs *models.NotificationPreferences) error
	CreateDefault(userID uint64) error
}

type notificationPreferencesRepository struct {
	db *sql.DB
}

// NewNotificationPreferencesRepository creates a new notification preferences repository
func NewNotificationPreferencesRepository(db *sql.DB) NotificationPreferencesRepository {
	return &notificationPreferencesRepository{db: db}
}

// Get retrieves notification preferences for a user
func (r *notificationPreferencesRepository) Get(userID uint64) (*models.NotificationPreferences, error) {
	query := `SELECT user_id, weight_limit_alerts, device_offline_alerts, weekly_reports, 
		email_notifications, sms_notifications, created_at, updated_at 
		FROM user_notification_preferences WHERE user_id = ?`

	var prefs models.NotificationPreferences
	err := r.db.QueryRow(query, userID).Scan(
		&prefs.UserID,
		&prefs.WeightLimitAlerts,
		&prefs.DeviceOfflineAlerts,
		&prefs.WeeklyReports,
		&prefs.EmailNotifications,
		&prefs.SMSNotifications,
		&prefs.CreatedAt,
		&prefs.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		// Create default preferences if they don't exist
		if err := r.CreateDefault(userID); err != nil {
			return nil, err
		}
		// Retry fetching
		return r.Get(userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get notification preferences: %w", err)
	}

	return &prefs, nil
}

// Update updates notification preferences for a user
func (r *notificationPreferencesRepository) Update(prefs *models.NotificationPreferences) error {
	query := `UPDATE user_notification_preferences 
		SET weight_limit_alerts = ?, 
		    device_offline_alerts = ?, 
		    weekly_reports = ?,
		    email_notifications = ?,
		    sms_notifications = ?,
		    updated_at = NOW()
		WHERE user_id = ?`

	result, err := r.db.Exec(query,
		prefs.WeightLimitAlerts,
		prefs.DeviceOfflineAlerts,
		prefs.WeeklyReports,
		prefs.EmailNotifications,
		prefs.SMSNotifications,
		prefs.UserID,
	)
	if err != nil {
		return fmt.Errorf("failed to update notification preferences: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		// Preferences don't exist, create them
		return r.CreateDefault(prefs.UserID)
	}

	return nil
}

// CreateDefault creates default notification preferences for a user
func (r *notificationPreferencesRepository) CreateDefault(userID uint64) error {
	query := `INSERT INTO user_notification_preferences 
		(user_id, weight_limit_alerts, device_offline_alerts, weekly_reports, email_notifications, sms_notifications) 
		VALUES (?, TRUE, TRUE, FALSE, TRUE, FALSE)
		ON DUPLICATE KEY UPDATE user_id = user_id`

	_, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to create default notification preferences: %w", err)
	}

	return nil
}
