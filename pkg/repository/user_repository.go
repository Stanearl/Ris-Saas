package repository

import (
	"database/sql"
	"fmt"
	"time"

	"iot-telemetry-platform/pkg/models"
)

// UserRepository handles database operations for users
type UserRepository interface {
	Create(email, passwordHash, fullName string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	GetByID(id uint64) (*models.User, error)
	UpdateSubscriptionStatus(userID uint64, status string, expiresAt *time.Time) error
	UpdateLastLogin(userID uint64) error
	UpdatePaystackInfo(userID uint64, customerCode, subscriptionCode *string) error
	EnableTOTP(userID uint64, secret string) error
	DisableTOTP(userID uint64) error
}

type userRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new user repository instance
func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

// Create creates a new user in the database
func (r *userRepository) Create(email, passwordHash, fullName string) (*models.User, error) {
	query := `INSERT INTO users (email, password_hash, full_name, subscription_status) 
	          VALUES (?, ?, ?, ?)`

	result, err := r.db.Exec(query, email, passwordHash, fullName, models.SubscriptionStatusCanceled)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get user ID: %w", err)
	}

	return r.GetByID(uint64(id))
}

// GetByEmail retrieves a user by email
func (r *userRepository) GetByEmail(email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, totp_secret, totp_enabled, full_name, subscription_status, 
	          paystack_customer_code, paystack_subscription_code, subscription_expires_at,
	          created_at, updated_at, last_login_at
	          FROM users WHERE email = ?`

	user := &models.User{}
	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.TOTPSecret,
		&user.TOTPEnabled,
		&user.FullName,
		&user.SubscriptionStatus,
		&user.PaystackCustomerCode,
		&user.PaystackSubscriptionCode,
		&user.SubscriptionExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByID retrieves a user by ID
func (r *userRepository) GetByID(id uint64) (*models.User, error) {
	query := `SELECT id, email, password_hash, totp_secret, totp_enabled, full_name, subscription_status,
	          paystack_customer_code, paystack_subscription_code, subscription_expires_at,
	          created_at, updated_at, last_login_at
	          FROM users WHERE id = ?`

	user := &models.User{}
	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.TOTPSecret,
		&user.TOTPEnabled,
		&user.FullName,
		&user.SubscriptionStatus,
		&user.PaystackCustomerCode,
		&user.PaystackSubscriptionCode,
		&user.SubscriptionExpiresAt,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// UpdateSubscriptionStatus updates the user's subscription status
func (r *userRepository) UpdateSubscriptionStatus(userID uint64, status string, expiresAt *time.Time) error {
	query := `UPDATE users SET subscription_status = ?, subscription_expires_at = ?, updated_at = NOW() 
	          WHERE id = ?`

	_, err := r.db.Exec(query, status, expiresAt, userID)
	if err != nil {
		return fmt.Errorf("failed to update subscription status: %w", err)
	}

	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (r *userRepository) UpdateLastLogin(userID uint64) error {
	query := `UPDATE users SET last_login_at = NOW() WHERE id = ?`

	_, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}

// UpdatePaystackInfo updates the user's Paystack customer and subscription codes
func (r *userRepository) UpdatePaystackInfo(userID uint64, customerCode, subscriptionCode *string) error {
	query := `UPDATE users SET paystack_customer_code = ?, paystack_subscription_code = ?, updated_at = NOW() 
	          WHERE id = ?`

	_, err := r.db.Exec(query, customerCode, subscriptionCode, userID)
	if err != nil {
		return fmt.Errorf("failed to update Paystack info: %w", err)
	}

	return nil
}

// EnableTOTP enables 2FA for a user and stores the TOTP secret
func (r *userRepository) EnableTOTP(userID uint64, secret string) error {
	query := `UPDATE users 
	          SET totp_secret = ?, totp_enabled = TRUE, updated_at = NOW()
	          WHERE id = ?`

	_, err := r.db.Exec(query, secret, userID)
	if err != nil {
		return fmt.Errorf("failed to enable TOTP: %w", err)
	}

	return nil
}

// DisableTOTP disables 2FA for a user
func (r *userRepository) DisableTOTP(userID uint64) error {
	query := `UPDATE users 
	          SET totp_secret = NULL, totp_enabled = FALSE, updated_at = NOW()
	          WHERE id = ?`

	_, err := r.db.Exec(query, userID)
	if err != nil {
		return fmt.Errorf("failed to disable TOTP: %w", err)
	}

	return nil
}
