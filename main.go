package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/mux"

	"iot-telemetry-platform/pkg/auth"
	"iot-telemetry-platform/pkg/handlers"
	"iot-telemetry-platform/pkg/middleware"
	"iot-telemetry-platform/pkg/repository"
)

// Configuration
type Config struct {
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	ServerPort         string
	JWTSecretKey       string
	JWTIssuer          string
	JWTExpirationHours int
	PaystackSecretKey  string
}

// Database connection pool
var db *sql.DB

// Models
type Device struct {
	DeviceID           string     `json:"device_id"`
	DeviceName         string     `json:"device_name"`
	TruckRegistration  string     `json:"truck_registration"`
	Industry           string     `json:"industry"`
	LoadLimitKg        int        `json:"load_limit_kg"`
	ThrottleEnabled    bool       `json:"throttle_enabled"`
	FuelCapacityLiters float64    `json:"fuel_capacity_liters"`
	Status             string     `json:"status"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	LastSeenAt         *time.Time `json:"last_seen_at,omitempty"`
}

type TelemetryReading struct {
	Timestamp         time.Time `json:"timestamp"`
	WeightKg          int       `json:"weight_kg"`
	Latitude          float64   `json:"latitude"`
	Longitude         float64   `json:"longitude"`
	FuelLevelLiters   *float64  `json:"fuel_level_liters,omitempty"`
	SpeedKmh          *float64  `json:"speed_kmh,omitempty"`
	ECUThrottleActive bool      `json:"ecu_throttle_active"`
}

type SingleTelemetryRequest struct {
	DeviceID          string    `json:"device_id"`
	Timestamp         time.Time `json:"timestamp"`
	WeightKg          int       `json:"weight_kg"`
	Latitude          float64   `json:"latitude"`
	Longitude         float64   `json:"longitude"`
	FuelLevelLiters   *float64  `json:"fuel_level_liters,omitempty"`
	SpeedKmh          *float64  `json:"speed_kmh,omitempty"`
	ECUThrottleActive bool      `json:"ecu_throttle_active"`
}

type BatchTelemetryRequest struct {
	DeviceID string             `json:"device_id"`
	Readings []TelemetryReading `json:"readings"`
}

// SugarWANDemoTelemetryRequest matches the "Wizard of Oz" Particle Console
// webhook payload used for the SugarWAN stakeholder demo (device: Tango).
// DEMO ONLY - bypasses the normal hardware telemetry schema.
type SugarWANDemoTelemetryRequest struct {
	DeviceID   string  `json:"device_id"`
	Timestamp  string  `json:"timestamp"`
	WeightKg   float64 `json:"weight_kg"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	SpeedKmh   float64 `json:"speed_kmh"`
	FuelLiters float64 `json:"fuel_liters"`
}

type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Code    string                   `json:"code"`
	Message string                   `json:"message"`
	Details []map[string]interface{} `json:"details,omitempty"`
}

// Initialize database connection
func initDB(config Config) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=UTC",
		config.DBUser,
		config.DBPassword,
		config.DBHost,
		config.DBPort,
		config.DBName,
	)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}

	// Configure connection pool for high-volume operations
	db.SetMaxOpenConns(100)
	db.SetMaxIdleConns(20)
	db.SetConnMaxLifetime(time.Hour)
	db.SetConnMaxIdleTime(10 * time.Minute)

	// Test connection
	if err = db.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

// DEMO ONLY: static bearer token bypass for SugarWAN Wizard-of-Oz Particle webhook.
// Remove demoBearerToken check before production hardware rollout.
const demoBearerToken = "Bearer sugarwan-demo-2026"

// Middleware: Simple API Key authentication for device ingestion
func deviceAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		authHeader := r.Header.Get("Authorization")

		// DEMO BYPASS: static bearer token, skips HMAC/JWT validation entirely.
		if authHeader == demoBearerToken {
			next(w, r)
			return
		}

		// Simple validation (in production, validate against database/cache)
		if apiKey == "" && authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or missing authentication credentials", nil)
			return
		}

		next(w, r)
	}
}

// Middleware: CORS
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Cloudflare Pages frontend
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"https://connect.ris.africa",
			"http://localhost:5173", // Local development (Vite)
			"http://localhost:4173", // Local preview
			"http://localhost:3000", // Alternative dev port
		}

		// Check if origin is allowed
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Middleware: Logging
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("[%s] %s %s", r.Method, r.RequestURI, r.RemoteAddr)
		next.ServeHTTP(w, r)
		log.Printf("Completed in %v", time.Since(start))
	})
}

// Handler: POST /telemetry
func handleTelemetry(w http.ResponseWriter, r *http.Request) {
	// Check if it's a batch or single payload
	var rawPayload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&rawPayload); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Determine if batch or single
	if readings, ok := rawPayload["readings"]; ok && readings != nil {
		handleBatchTelemetry(w, rawPayload)
	} else {
		handleSingleTelemetry(w, rawPayload)
	}
}

// Handler: POST /v1/demo/telemetry
// DEMO ONLY - SugarWAN "Wizard of Oz" ingestion endpoint for Particle Console
// webhook payloads. Parses the simplified JSON schema and writes it into the
// standard telemetry table so it renders on the dashboard immediately.
func handleSugarWANDemoTelemetry(w http.ResponseWriter, r *http.Request) {
	var req SugarWANDemoTelemetryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	if req.DeviceID == "" {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "device_id is required", nil)
		return
	}

	// Parse timestamp; fall back to server time if unparseable (demo tolerance).
	timestamp := time.Now().UTC()
	if req.Timestamp != "" {
		if parsed, err := time.Parse(time.RFC3339, req.Timestamp); err == nil {
			timestamp = parsed
		}
	}

	if !deviceExists(req.DeviceID) {
		respondWithError(w, http.StatusNotFound, "DEVICE_NOT_FOUND", fmt.Sprintf("Device '%s' not found in registry", req.DeviceID), nil)
		return
	}

	speed := req.SpeedKmh
	fuel := req.FuelLiters

	recordID, err := insertTelemetry(req.DeviceID, timestamp, int(req.WeightKg), req.Latitude, req.Longitude,
		&fuel, &speed, false)
	if err != nil {
		log.Printf("Error inserting demo telemetry: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred while processing your request", nil)
		return
	}

	updateDeviceLastSeen(req.DeviceID, timestamp)

	respondWithSuccess(w, http.StatusCreated, "Demo telemetry data received", map[string]interface{}{
		"device_id":    req.DeviceID,
		"timestamp":    timestamp,
		"record_id":    recordID,
		"processed_at": time.Now().UTC(),
	})
}

// Handle single telemetry payload
func handleSingleTelemetry(w http.ResponseWriter, payload map[string]interface{}) {
	// Re-marshal and unmarshal to proper struct
	payloadBytes, _ := json.Marshal(payload)
	var req SingleTelemetryRequest
	if err := json.Unmarshal(payloadBytes, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request payload", nil)
		return
	}

	// Validate
	if err := validateSingleTelemetry(&req); err != nil {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Telemetry data validation failed", err)
		return
	}

	// Check if device exists
	if !deviceExists(req.DeviceID) {
		respondWithError(w, http.StatusNotFound, "DEVICE_NOT_FOUND", fmt.Sprintf("Device '%s' not found in registry", req.DeviceID), nil)
		return
	}

	// Insert telemetry
	recordID, err := insertTelemetry(req.DeviceID, req.Timestamp, req.WeightKg, req.Latitude, req.Longitude,
		req.FuelLevelLiters, req.SpeedKmh, req.ECUThrottleActive)
	if err != nil {
		log.Printf("Error inserting telemetry: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred while processing your request", nil)
		return
	}

	// Update device last_seen_at
	updateDeviceLastSeen(req.DeviceID, req.Timestamp)

	respondWithSuccess(w, http.StatusCreated, "Telemetry data received", map[string]interface{}{
		"device_id":    req.DeviceID,
		"timestamp":    req.Timestamp,
		"record_id":    recordID,
		"processed_at": time.Now().UTC(),
	})
}

// Handle batch telemetry payload
func handleBatchTelemetry(w http.ResponseWriter, payload map[string]interface{}) {
	payloadBytes, _ := json.Marshal(payload)
	var req BatchTelemetryRequest
	if err := json.Unmarshal(payloadBytes, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request payload", nil)
		return
	}

	// Validate batch size
	if len(req.Readings) == 0 || len(req.Readings) > 100 {
		respondWithError(w, http.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "Batch size must be between 1 and 100 readings", nil)
		return
	}

	// Check if device exists
	if !deviceExists(req.DeviceID) {
		respondWithError(w, http.StatusNotFound, "DEVICE_NOT_FOUND", fmt.Sprintf("Device '%s' not found in registry", req.DeviceID), nil)
		return
	}

	// Insert batch
	inserted, failed := insertBatchTelemetry(req.DeviceID, req.Readings)

	// Update device last_seen_at with latest timestamp
	if len(req.Readings) > 0 {
		latestTimestamp := req.Readings[0].Timestamp
		for _, reading := range req.Readings {
			if reading.Timestamp.After(latestTimestamp) {
				latestTimestamp = reading.Timestamp
			}
		}
		updateDeviceLastSeen(req.DeviceID, latestTimestamp)
	}

	respondWithSuccess(w, http.StatusCreated, "Batch telemetry data received", map[string]interface{}{
		"device_id":        req.DeviceID,
		"records_received": len(req.Readings),
		"records_inserted": inserted,
		"records_failed":   failed,
		"processed_at":     time.Now().UTC(),
	})
}

// Handler: POST /devices/{device_id}/heartbeat
func handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["device_id"]

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Check if device exists
	if !deviceExists(deviceID) {
		respondWithError(w, http.StatusNotFound, "DEVICE_NOT_FOUND", fmt.Sprintf("Device '%s' not found in registry", deviceID), nil)
		return
	}

	// Update last_seen_at
	timestamp := time.Now().UTC()
	if ts, ok := payload["timestamp"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339, ts); err == nil {
			timestamp = parsed
		}
	}

	updateDeviceLastSeen(deviceID, timestamp)

	respondWithSuccess(w, http.StatusOK, "Heartbeat received", map[string]interface{}{
		"device_id":      deviceID,
		"server_time":    time.Now().UTC(),
		"config_updated": false,
	})
}

// Handler: GET /devices/{device_id}/config
func handleGetDeviceConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["device_id"]

	device, err := getDevice(deviceID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "DEVICE_NOT_FOUND", fmt.Sprintf("Device '%s' not found in registry", deviceID), nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "", map[string]interface{}{
		"device_id":                  device.DeviceID,
		"load_limit_kg":              device.LoadLimitKg,
		"throttle_enabled":           device.ThrottleEnabled,
		"fuel_capacity_liters":       device.FuelCapacityLiters,
		"reporting_interval_seconds": 60,
		"updated_at":                 device.UpdatedAt,
	})
}

// Handler: GET /api/devices/{device_id}/live - Protected by subscription
func handleGetDeviceLive(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["device_id"]

	// Get latest telemetry for the device
	query := `SELECT timestamp, weight_kg, latitude, longitude, fuel_level_liters, 
	          speed_kmh, ecu_throttle_active 
	          FROM telemetry 
	          WHERE device_id = ? 
	          ORDER BY timestamp DESC 
	          LIMIT 1`

	var reading TelemetryReading
	err := db.QueryRow(query, deviceID).Scan(
		&reading.Timestamp,
		&reading.WeightKg,
		&reading.Latitude,
		&reading.Longitude,
		&reading.FuelLevelLiters,
		&reading.SpeedKmh,
		&reading.ECUThrottleActive,
	)

	if err == sql.ErrNoRows {
		respondWithError(w, http.StatusNotFound, "NO_DATA", "No telemetry data available for this device", nil)
		return
	}
	if err != nil {
		log.Printf("Error fetching live data: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch device data", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Live device data", map[string]interface{}{
		"device_id": deviceID,
		"reading":   reading,
	})
}

// Database operations
func deviceExists(deviceID string) bool {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM devices WHERE device_id = ? AND status = 'active')"
	err := db.QueryRow(query, deviceID).Scan(&exists)
	return err == nil && exists
}

func getDevice(deviceID string) (*Device, error) {
	var device Device
	query := `SELECT device_id, device_name, truck_registration, industry, load_limit_kg, 
	          throttle_enabled, fuel_capacity_liters, status, created_at, updated_at 
	          FROM devices WHERE device_id = ?`
	err := db.QueryRow(query, deviceID).Scan(
		&device.DeviceID, &device.DeviceName, &device.TruckRegistration, &device.Industry,
		&device.LoadLimitKg, &device.ThrottleEnabled, &device.FuelCapacityLiters,
		&device.Status, &device.CreatedAt, &device.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &device, nil
}

func insertTelemetry(deviceID string, timestamp time.Time, weightKg int, latitude, longitude float64,
	fuelLevel, speed *float64, throttleActive bool) (int64, error) {
	query := `INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, 
	          fuel_level_liters, speed_kmh, ecu_throttle_active) 
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := db.Exec(query, deviceID, timestamp, weightKg, latitude, longitude,
		fuelLevel, speed, throttleActive)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func insertBatchTelemetry(deviceID string, readings []TelemetryReading) (int, int) {
	inserted := 0
	failed := 0

	// Use transaction for batch insert
	tx, err := db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return 0, len(readings)
	}

	stmt, err := tx.Prepare(`INSERT INTO telemetry (device_id, timestamp, weight_kg, latitude, longitude, 
	                         fuel_level_liters, speed_kmh, ecu_throttle_active) 
	                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		tx.Rollback()
		log.Printf("Error preparing statement: %v", err)
		return 0, len(readings)
	}
	defer stmt.Close()

	for _, reading := range readings {
		_, err := stmt.Exec(deviceID, reading.Timestamp, reading.WeightKg, reading.Latitude,
			reading.Longitude, reading.FuelLevelLiters, reading.SpeedKmh, reading.ECUThrottleActive)
		if err != nil {
			log.Printf("Error inserting reading: %v", err)
			failed++
		} else {
			inserted++
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return 0, len(readings)
	}

	return inserted, failed
}

func updateDeviceLastSeen(deviceID string, timestamp time.Time) {
	query := "UPDATE devices SET last_seen_at = ? WHERE device_id = ?"
	_, err := db.Exec(query, timestamp, deviceID)
	if err != nil {
		log.Printf("Error updating last_seen_at: %v", err)
	}
}

// Validation
func validateSingleTelemetry(req *SingleTelemetryRequest) []map[string]interface{} {
	var errors []map[string]interface{}

	if req.DeviceID == "" {
		errors = append(errors, map[string]interface{}{"field": "device_id", "issue": "required"})
	}
	if req.Timestamp.After(time.Now().UTC()) {
		errors = append(errors, map[string]interface{}{"field": "timestamp", "issue": "cannot be in the future"})
	}
	if req.WeightKg < 0 {
		errors = append(errors, map[string]interface{}{"field": "weight_kg", "issue": "must be non-negative"})
	}
	if req.Latitude < -90 || req.Latitude > 90 {
		errors = append(errors, map[string]interface{}{"field": "latitude", "issue": "must be between -90 and 90"})
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		errors = append(errors, map[string]interface{}{"field": "longitude", "issue": "must be between -180 and 180"})
	}
	if req.SpeedKmh != nil && *req.SpeedKmh < 0 {
		errors = append(errors, map[string]interface{}{"field": "speed_kmh", "issue": "must be non-negative"})
	}
	if req.FuelLevelLiters != nil && *req.FuelLevelLiters < 0 {
		errors = append(errors, map[string]interface{}{"field": "fuel_level_liters", "issue": "must be non-negative"})
	}

	if len(errors) > 0 {
		return errors
	}
	return nil
}

// Response helpers
func respondWithSuccess(w http.ResponseWriter, statusCode int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(APIResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func respondWithError(w http.ResponseWriter, statusCode int, code, message string, details []map[string]interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// Health check handler
func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	// Check database connection
	if err := db.Ping(); err != nil {
		respondWithError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "Database connection failed", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Service is healthy", map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"database":  "connected",
	})
}

func main() {
	// Load configuration from environment variables
	config := Config{
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "3306"),
		DBUser:             getEnv("DB_USER", "root"),
		DBPassword:         getEnv("DB_PASSWORD", "password"),
		DBName:             getEnv("DB_NAME", "iot_telemetry"),
		ServerPort:         getEnv("SERVER_PORT", "8080"),
		JWTSecretKey:       getEnv("JWT_SECRET_KEY", "change_this_secret_key"),
		JWTIssuer:          getEnv("JWT_ISSUER", "iot-telemetry-platform"),
		JWTExpirationHours: getEnvAsInt("JWT_EXPIRATION_HOURS", 168),
		PaystackSecretKey:  getEnv("PAYSTACK_SECRET_KEY", ""),
	}

	// Initialize database
	if err := initDB(config); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize services
	passwordService := auth.NewPasswordService()
	jwtService := auth.NewJWTService(
		config.JWTSecretKey,
		config.JWTIssuer,
		time.Duration(config.JWTExpirationHours)*time.Hour,
	)
	totpService := auth.NewTOTPService(config.JWTIssuer)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	deviceRepo := repository.NewDeviceRepository(db)
	notificationRepo := repository.NewNotificationPreferencesRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, passwordService, jwtService, totpService)
	paystackHandler := handlers.NewPaystackHandler(userRepo, subscriptionRepo, config.PaystackSecretKey)
	deviceHandler := handlers.NewDeviceHandler(deviceRepo)
	telemetryHandler := handlers.NewTelemetryHandler(db)
	totpHandler := handlers.NewTOTPHandler(userRepo, totpService)
	fleetHandler := handlers.NewFleetHandler(deviceRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)

	// Initialize middleware
	jwtMiddleware := middleware.NewJWTMiddleware(jwtService)

	// Setup router
	router := mux.NewRouter()
	router.Use(corsMiddleware)
	router.Use(loggingMiddleware)

	// Public routes
	router.HandleFunc("/health", handleHealthCheck).Methods("GET")

	// Authentication routes (public)
	router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")

	// Paystack webhook (public but signature-verified)
	router.HandleFunc("/api/webhooks/paystack", paystackHandler.HandleWebhook).Methods("POST")

	// Device ingestion routes (API key auth - never blocked by subscription)
	router.HandleFunc("/v1/telemetry", deviceAuthMiddleware(handleTelemetry)).Methods("POST")
	router.HandleFunc("/v1/devices/{device_id}/heartbeat", deviceAuthMiddleware(handleHeartbeat)).Methods("POST")
	router.HandleFunc("/v1/devices/{device_id}/config", deviceAuthMiddleware(handleGetDeviceConfig)).Methods("GET")

	// DEMO ONLY: SugarWAN "Wizard of Oz" ingestion route for Particle Console webhook
	router.HandleFunc("/v1/demo/telemetry", deviceAuthMiddleware(handleSugarWANDemoTelemetry)).Methods("POST")

	// Protected dashboard routes (JWT + active subscription required)
	router.HandleFunc("/api/devices/{device_id}/live", jwtMiddleware.RequireActiveSubscription(handleGetDeviceLive)).Methods("GET")
	router.HandleFunc("/api/devices/{device_id}/telemetry/history", jwtMiddleware.RequireActiveSubscription(telemetryHandler.GetTelemetryHistory)).Methods("GET")

	// Device management routes (JWT required, no subscription check)
	router.HandleFunc("/api/devices/register", jwtMiddleware.RequireAuth(deviceHandler.RegisterDevice)).Methods("POST")
	router.HandleFunc("/api/devices", jwtMiddleware.RequireAuth(deviceHandler.GetUserDevices)).Methods("GET")

	// Password management routes (JWT required)
	router.HandleFunc("/api/auth/change-password", jwtMiddleware.RequireAuth(authHandler.ChangePassword)).Methods("POST", "OPTIONS")

	// 2FA routes (JWT required)
	router.HandleFunc("/api/auth/2fa/setup", jwtMiddleware.RequireAuth(totpHandler.Setup2FA)).Methods("POST")
	router.HandleFunc("/api/auth/2fa/verify", jwtMiddleware.RequireAuth(totpHandler.Verify2FA)).Methods("POST")
	router.HandleFunc("/api/auth/2fa/disable", jwtMiddleware.RequireAuth(totpHandler.Disable2FA)).Methods("POST")

	// Fleet status routes (JWT required)
	router.HandleFunc("/api/fleet/status", jwtMiddleware.RequireAuth(fleetHandler.GetFleetStatus)).Methods("GET")

	// Notification preferences routes (JWT required)
	router.HandleFunc("/api/user/notification-preferences", jwtMiddleware.RequireAuth(notificationHandler.GetPreferences)).Methods("GET")
	router.HandleFunc("/api/user/notification-preferences", jwtMiddleware.RequireAuth(notificationHandler.UpdatePreferences)).Methods("PUT")

	// Start server
	addr := fmt.Sprintf(":%s", config.ServerPort)
	log.Printf("🚀 IoT Telemetry Platform with JWT Auth & Paystack Integration")
	log.Printf("📊 Server starting on %s", addr)
	log.Printf("🗄️  Database: %s@%s:%s/%s", config.DBUser, config.DBHost, config.DBPort, config.DBName)
	log.Printf("🔐 JWT Expiration: %d hours", config.JWTExpirationHours)
	log.Printf("💳 Paystack Integration: %s", map[bool]string{true: "Enabled", false: "Disabled"}[config.PaystackSecretKey != ""])

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
