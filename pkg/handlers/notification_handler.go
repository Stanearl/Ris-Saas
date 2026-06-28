package handlers

import (
	"encoding/json"
	"net/http"

	"iot-telemetry-platform/pkg/models"
	"iot-telemetry-platform/pkg/repository"
)

// NotificationHandler handles notification preferences HTTP requests
type NotificationHandler struct {
	notificationRepo repository.NotificationPreferencesRepository
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationRepo repository.NotificationPreferencesRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
	}
}

// GetPreferences retrieves notification preferences for the authenticated user
func (h *NotificationHandler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context", nil)
		return
	}

	// Get preferences
	prefs, err := h.notificationRepo.Get(userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve notification preferences", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Notification preferences retrieved successfully", prefs)
}

// UpdatePreferences updates notification preferences for the authenticated user
func (h *NotificationHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context", nil)
		return
	}

	// Parse request body
	var prefs models.NotificationPreferences
	if err := json.NewDecoder(r.Body).Decode(&prefs); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Set user ID from context (prevent users from updating other users' preferences)
	prefs.UserID = userID

	// Update preferences
	if err := h.notificationRepo.Update(&prefs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update notification preferences", nil)
		return
	}

	// Fetch updated preferences
	updatedPrefs, err := h.notificationRepo.Get(userID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve updated preferences", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Notification preferences updated successfully", updatedPrefs)
}
