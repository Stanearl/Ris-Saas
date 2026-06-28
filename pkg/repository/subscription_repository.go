package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"iot-telemetry-platform/pkg/models"
)

// SubscriptionRepository handles database operations for subscription events
type SubscriptionRepository interface {
	LogEvent(event *models.SubscriptionEvent) error
	GetUserEvents(userID uint64, limit int) ([]*models.SubscriptionEvent, error)
}

type subscriptionRepository struct {
	db *sql.DB
}

// NewSubscriptionRepository creates a new subscription repository instance
func NewSubscriptionRepository(db *sql.DB) SubscriptionRepository {
	return &subscriptionRepository{db: db}
}

// LogEvent logs a subscription event to the database
func (r *subscriptionRepository) LogEvent(event *models.SubscriptionEvent) error {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `INSERT INTO subscription_events 
	          (user_id, event_type, paystack_event_id, subscription_code, amount, currency, status, metadata) 
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = r.db.Exec(query,
		event.UserID,
		event.EventType,
		event.PaystackEventID,
		event.SubscriptionCode,
		event.Amount,
		event.Currency,
		event.Status,
		metadataJSON,
	)

	if err != nil {
		return fmt.Errorf("failed to log subscription event: %w", err)
	}

	return nil
}

// GetUserEvents retrieves subscription events for a user
func (r *subscriptionRepository) GetUserEvents(userID uint64, limit int) ([]*models.SubscriptionEvent, error) {
	query := `SELECT id, user_id, event_type, paystack_event_id, subscription_code, 
	          amount, currency, status, metadata, created_at
	          FROM subscription_events 
	          WHERE user_id = ? 
	          ORDER BY created_at DESC 
	          LIMIT ?`

	rows, err := r.db.Query(query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription events: %w", err)
	}
	defer rows.Close()

	var events []*models.SubscriptionEvent
	for rows.Next() {
		event := &models.SubscriptionEvent{}
		var metadataJSON []byte

		err := rows.Scan(
			&event.ID,
			&event.UserID,
			&event.EventType,
			&event.PaystackEventID,
			&event.SubscriptionCode,
			&event.Amount,
			&event.Currency,
			&event.Status,
			&metadataJSON,
			&event.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subscription event: %w", err)
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, event)
	}

	return events, nil
}
