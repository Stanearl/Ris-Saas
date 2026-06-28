package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"iot-telemetry-platform/pkg/repository"
)

// DeviceHandler handles device-related HTTP requests
type DeviceHandler struct {
	deviceRepo repository.DeviceRepository
}

// NewDeviceHandler creates a new device handler
func NewDeviceHandler(deviceRepo repository.DeviceRepository) *DeviceHandler {
	return &DeviceHandler{
		deviceRepo: deviceRepo,
	}
}

// RegisterDeviceRequest represents the device registration request payload
type RegisterDeviceRequest struct {
	DeviceName   string `json:"device_name"`
	HardwareTier int    `json:"hardware_tier"`
	LoadLimitKg  int    `json:"load_limit_kg"`
}

// RegisterDevice handles device registration
func (h *DeviceHandler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	var req RegisterDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Validate input
	if errors := h.validateRegistration(&req); errors != nil {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Device registration validation failed", errors)
		return
	}

	// Create device
	device, err := h.deviceRepo.Create(userID, req.DeviceName, req.HardwareTier, req.LoadLimitKg)
	if err != nil {
		log.Printf("Error creating device: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to register device", nil)
		return
	}

	respondWithSuccess(w, http.StatusCreated, "Device registered successfully", device)
}

// GetUserDevices retrieves all devices for the authenticated user
func (h *DeviceHandler) GetUserDevices(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	devices, err := h.deviceRepo.GetByUserID(userID)
	if err != nil {
		log.Printf("Error fetching devices: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch devices", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Devices retrieved successfully", map[string]interface{}{
		"devices": devices,
		"count":   len(devices),
	})
}

// validateRegistration validates device registration input
func (h *DeviceHandler) validateRegistration(req *RegisterDeviceRequest) []map[string]interface{} {
	var errors []map[string]interface{}

	if req.DeviceName == "" {
		errors = append(errors, map[string]interface{}{"field": "device_name", "issue": "required"})
	} else if len(req.DeviceName) < 3 {
		errors = append(errors, map[string]interface{}{"field": "device_name", "issue": "must be at least 3 characters"})
	}

	if req.HardwareTier < 1 || req.HardwareTier > 3 {
		errors = append(errors, map[string]interface{}{"field": "hardware_tier", "issue": "must be 1, 2, or 3"})
	}

	if req.LoadLimitKg <= 0 {
		errors = append(errors, map[string]interface{}{"field": "load_limit_kg", "issue": "must be greater than 0"})
	} else if req.LoadLimitKg > 100000 {
		errors = append(errors, map[string]interface{}{"field": "load_limit_kg", "issue": "must be less than 100,000 kg"})
	}

	if len(errors) > 0 {
		return errors
	}
	return nil
}
