package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"iot-telemetry-platform/pkg/auth"
	"iot-telemetry-platform/pkg/repository"
)

// TOTPHandler handles 2FA-related HTTP requests
type TOTPHandler struct {
	userRepo    repository.UserRepository
	totpService auth.TOTPService
}

// NewTOTPHandler creates a new TOTP handler
func NewTOTPHandler(userRepo repository.UserRepository, totpService auth.TOTPService) *TOTPHandler {
	return &TOTPHandler{
		userRepo:    userRepo,
		totpService: totpService,
	}
}

// Setup2FARequest represents the request to initiate 2FA setup
type Setup2FARequest struct {
	// No body needed - user ID comes from JWT context
}

// Setup2FAResponse represents the response for 2FA setup
type Setup2FAResponse struct {
	Secret string `json:"secret"`
	QRCode string `json:"qr_code"`
}

// Verify2FARequest represents the request to verify and enable 2FA
type Verify2FARequest struct {
	Code string `json:"code"`
}

// Disable2FARequest represents the request to disable 2FA
type Disable2FARequest struct {
	Code string `json:"code"` // Require current TOTP code to disable
}

// Setup2FA generates a new TOTP secret and QR code for the user
// POST /api/auth/2fa/setup
func (h *TOTPHandler) Setup2FA(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by JWT middleware)
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	// Get user from database
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		log.Printf("Error fetching user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch user", nil)
		return
	}

	// Generate TOTP secret
	key, err := h.totpService.GenerateSecret(user.Email)
	if err != nil {
		log.Printf("Error generating TOTP secret: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate 2FA secret", nil)
		return
	}

	// Generate QR code
	qrCode, err := h.totpService.GenerateQRCode(key)
	if err != nil {
		log.Printf("Error generating QR code: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate QR code", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "2FA setup initiated. Scan QR code with your authenticator app.", map[string]interface{}{
		"secret":  key.Secret(),
		"qr_code": qrCode,
	})
}

// Verify2FA verifies the TOTP code and enables 2FA for the user
// POST /api/auth/2fa/verify
func (h *TOTPHandler) Verify2FA(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	// Parse request
	var req Verify2FARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Validate code format
	if len(req.Code) != 6 {
		respondWithError(w, http.StatusBadRequest, "INVALID_CODE", "TOTP code must be 6 digits", nil)
		return
	}

	// Get the secret from query parameter (sent from setup)
	secret := r.URL.Query().Get("secret")
	if secret == "" {
		respondWithError(w, http.StatusBadRequest, "MISSING_SECRET", "TOTP secret is required", nil)
		return
	}

	// Validate the TOTP code
	if !h.totpService.ValidateCode(secret, req.Code) {
		respondWithError(w, http.StatusUnauthorized, "INVALID_CODE", "Invalid TOTP code", nil)
		return
	}

	// Enable 2FA for the user
	if err := h.userRepo.EnableTOTP(userID, secret); err != nil {
		log.Printf("Error enabling 2FA: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to enable 2FA", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "2FA enabled successfully", map[string]interface{}{
		"totp_enabled": true,
	})
}

// Disable2FA disables 2FA for the user
// POST /api/auth/2fa/disable
func (h *TOTPHandler) Disable2FA(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	// Parse request
	var req Disable2FARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Get user from database
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		log.Printf("Error fetching user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch user", nil)
		return
	}

	// Check if 2FA is enabled
	if !user.TOTPEnabled || user.TOTPSecret == nil {
		respondWithError(w, http.StatusBadRequest, "2FA_NOT_ENABLED", "2FA is not enabled for this account", nil)
		return
	}

	// Validate the TOTP code before disabling
	if !h.totpService.ValidateCode(*user.TOTPSecret, req.Code) {
		respondWithError(w, http.StatusUnauthorized, "INVALID_CODE", "Invalid TOTP code", nil)
		return
	}

	// Disable 2FA
	if err := h.userRepo.DisableTOTP(userID); err != nil {
		log.Printf("Error disabling 2FA: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to disable 2FA", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "2FA disabled successfully", map[string]interface{}{
		"totp_enabled": false,
	})
}
