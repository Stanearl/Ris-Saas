package handlers

import (
	"context"
	"net/http"

	"iot-telemetry-platform/pkg/repository"
)

// FleetHandler handles fleet-related HTTP requests
type FleetHandler struct {
	deviceRepo repository.DeviceRepository
}

// NewFleetHandler creates a new fleet handler
func NewFleetHandler(deviceRepo repository.DeviceRepository) *FleetHandler {
	return &FleetHandler{
		deviceRepo: deviceRepo,
	}
}

// GetFleetStatus returns aggregate subscription status for user's fleet
func (h *FleetHandler) GetFleetStatus(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context", nil)
		return
	}

	// Get fleet status
	status, err := h.deviceRepo.GetFleetStatus(userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve fleet status", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Fleet status retrieved successfully", status)
}

// Helper to get user ID from context
func getUserIDFromContext(ctx context.Context) (uint64, bool) {
	userID, ok := ctx.Value("user_id").(uint64)
	return userID, ok
}
