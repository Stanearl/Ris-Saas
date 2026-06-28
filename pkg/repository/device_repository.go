package repository

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"iot-telemetry-platform/pkg/models"
)

// DeviceRepository handles device data operations
type DeviceRepository interface {
	Create(userID uint64, deviceName string, hardwareTier int, loadLimitKg int) (*models.Device, error)
	GetByID(deviceID string) (*models.Device, error)
	GetByUserID(userID uint64) ([]*models.Device, error)
	GetByAPIKey(apiKey string) (*models.Device, error)
}

type deviceRepository struct {
	db *sql.DB
}

// NewDeviceRepository creates a new device repository
func NewDeviceRepository(db *sql.DB) DeviceRepository {
	return &deviceRepository{db: db}
}

// Create creates a new device with a unique API key
func (r *deviceRepository) Create(userID uint64, deviceName string, hardwareTier int, loadLimitKg int) (*models.Device, error) {
	// Generate unique device ID
	deviceID := generateDeviceID()
	
	// Generate unique API key
	apiKey, err := generateAPIKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate API key: %w", err)
	}

	// Set default values
	industry := models.IndustryOther
	throttleEnabled := true
	fuelCapacityLiters := 400.0
	status := models.DeviceStatusActive

	query := `INSERT INTO devices 
		(device_id, user_id, device_name, hardware_tier, truck_registration, industry, 
		load_limit_kg, throttle_enabled, fuel_capacity_liters, status, api_key) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err = r.db.Exec(query, deviceID, userID, deviceName, hardwareTier, "", industry,
		loadLimitKg, throttleEnabled, fuelCapacityLiters, status, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create device: %w", err)
	}

	// Fetch the created device
	device, err := r.GetByID(deviceID)
	if err != nil {
		return nil, err
	}

	// Include API key in response (only time it's returned)
	device.APIKey = &apiKey

	return device, nil
}

// GetByID retrieves a device by its ID
func (r *deviceRepository) GetByID(deviceID string) (*models.Device, error) {
	query := `SELECT device_id, user_id, device_name, hardware_tier, truck_registration, 
		industry, load_limit_kg, throttle_enabled, fuel_capacity_liters, status, 
		created_at, updated_at, last_seen_at 
		FROM devices WHERE device_id = ?`

	var device models.Device
	var userID sql.NullInt64
	var lastSeenAt sql.NullTime

	err := r.db.QueryRow(query, deviceID).Scan(
		&device.DeviceID,
		&userID,
		&device.DeviceName,
		&device.HardwareTier,
		&device.TruckRegistration,
		&device.Industry,
		&device.LoadLimitKg,
		&device.ThrottleEnabled,
		&device.FuelCapacityLiters,
		&device.Status,
		&device.CreatedAt,
		&device.UpdatedAt,
		&lastSeenAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("device not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	if userID.Valid {
		uid := uint64(userID.Int64)
		device.UserID = &uid
	}
	if lastSeenAt.Valid {
		device.LastSeenAt = &lastSeenAt.Time
	}

	return &device, nil
}

// GetByUserID retrieves all devices for a user
func (r *deviceRepository) GetByUserID(userID uint64) ([]*models.Device, error) {
	query := `SELECT device_id, user_id, device_name, hardware_tier, truck_registration, 
		industry, load_limit_kg, throttle_enabled, fuel_capacity_liters, status, 
		created_at, updated_at, last_seen_at 
		FROM devices WHERE user_id = ? ORDER BY created_at DESC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get devices: %w", err)
	}
	defer rows.Close()

	var devices []*models.Device
	for rows.Next() {
		var device models.Device
		var userIDNull sql.NullInt64
		var lastSeenAt sql.NullTime

		err := rows.Scan(
			&device.DeviceID,
			&userIDNull,
			&device.DeviceName,
			&device.HardwareTier,
			&device.TruckRegistration,
			&device.Industry,
			&device.LoadLimitKg,
			&device.ThrottleEnabled,
			&device.FuelCapacityLiters,
			&device.Status,
			&device.CreatedAt,
			&device.UpdatedAt,
			&lastSeenAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan device: %w", err)
		}

		if userIDNull.Valid {
			uid := uint64(userIDNull.Int64)
			device.UserID = &uid
		}
		if lastSeenAt.Valid {
			device.LastSeenAt = &lastSeenAt.Time
		}

		devices = append(devices, &device)
	}

	return devices, nil
}

// GetByAPIKey retrieves a device by its API key
func (r *deviceRepository) GetByAPIKey(apiKey string) (*models.Device, error) {
	query := `SELECT device_id, user_id, device_name, hardware_tier, truck_registration, 
		industry, load_limit_kg, throttle_enabled, fuel_capacity_liters, status, 
		created_at, updated_at, last_seen_at 
		FROM devices WHERE api_key = ?`

	var device models.Device
	var userID sql.NullInt64
	var lastSeenAt sql.NullTime

	err := r.db.QueryRow(query, apiKey).Scan(
		&device.DeviceID,
		&userID,
		&device.DeviceName,
		&device.HardwareTier,
		&device.TruckRegistration,
		&device.Industry,
		&device.LoadLimitKg,
		&device.ThrottleEnabled,
		&device.FuelCapacityLiters,
		&device.Status,
		&device.CreatedAt,
		&device.UpdatedAt,
		&lastSeenAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("device not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get device: %w", err)
	}

	if userID.Valid {
		uid := uint64(userID.Int64)
		device.UserID = &uid
	}
	if lastSeenAt.Valid {
		device.LastSeenAt = &lastSeenAt.Time
	}

	return &device, nil
}

// generateDeviceID generates a unique device ID
func generateDeviceID() string {
	timestamp := time.Now().Unix()
	randomBytes := make([]byte, 4)
	rand.Read(randomBytes)
	return fmt.Sprintf("DEV-%d-%s", timestamp, hex.EncodeToString(randomBytes)[:8])
}

// generateAPIKey generates a secure random API key
func generateAPIKey() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
