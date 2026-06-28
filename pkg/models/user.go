package models

import (
	"time"
)

// User represents a user account
type User struct {
	ID                       uint64     `json:"id"`
	Email                    string     `json:"email"`
	PasswordHash             string     `json:"-"` // Never expose password hash in JSON
	TOTPSecret               *string    `json:"-"` // Never expose TOTP secret in JSON
	TOTPEnabled              bool       `json:"totp_enabled"`
	FullName                 string     `json:"full_name"`
	SubscriptionStatus       string     `json:"subscription_status"`
	PaystackCustomerCode     *string    `json:"paystack_customer_code,omitempty"`
	PaystackSubscriptionCode *string    `json:"paystack_subscription_code,omitempty"`
	SubscriptionExpiresAt    *time.Time `json:"subscription_expires_at,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
	LastLoginAt              *time.Time `json:"last_login_at,omitempty"`
}

// SubscriptionEvent represents a subscription-related event
type SubscriptionEvent struct {
	ID               uint64                 `json:"id"`
	UserID           uint64                 `json:"user_id"`
	EventType        string                 `json:"event_type"`
	PaystackEventID  *string                `json:"paystack_event_id,omitempty"`
	SubscriptionCode *string                `json:"subscription_code,omitempty"`
	Amount           *float64               `json:"amount,omitempty"`
	Currency         string                 `json:"currency"`
	Status           *string                `json:"status,omitempty"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt        time.Time              `json:"created_at"`
}

// Subscription status constants
const (
	SubscriptionStatusActive   = "active"
	SubscriptionStatusPastDue  = "past_due"
	SubscriptionStatusCanceled = "canceled"
)
