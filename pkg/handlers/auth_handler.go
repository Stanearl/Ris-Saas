package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"iot-telemetry-platform/pkg/auth"
	"iot-telemetry-platform/pkg/repository"
)

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	userRepo        repository.UserRepository
	passwordService auth.PasswordService
	jwtService      auth.JWTService
	totpService     auth.TOTPService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(
	userRepo repository.UserRepository,
	passwordService auth.PasswordService,
	jwtService auth.JWTService,
	totpService auth.TOTPService,
) *AuthHandler {
	return &AuthHandler{
		userRepo:        userRepo,
		passwordService: passwordService,
		jwtService:      jwtService,
		totpService:     totpService,
	}
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string  `json:"email"`
	Password string  `json:"password"`
	TOTPCode *string `json:"totp_code,omitempty"` // Optional 2FA code
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Validate input
	if errors := h.validateRegistration(&req); errors != nil {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Registration validation failed", errors)
		return
	}

	// Check if user already exists
	existingUser, _ := h.userRepo.GetByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "USER_EXISTS", "User with this email already exists", nil)
		return
	}

	// Hash password
	passwordHash, err := h.passwordService.HashPassword(req.Password)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred", nil)
		return
	}

	// Create user
	user, err := h.userRepo.Create(req.Email, passwordHash, req.FullName)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create user", nil)
		return
	}

	// Generate JWT token
	token, err := h.jwtService.GenerateToken(user.ID, user.Email, user.SubscriptionStatus)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate authentication token", nil)
		return
	}

	// Update last login
	h.userRepo.UpdateLastLogin(user.ID)

	respondWithSuccess(w, http.StatusCreated, "User registered successfully", AuthResponse{
		Token: token,
		User:  user,
	})
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Validate input
	if errors := h.validateLogin(&req); errors != nil {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Login validation failed", errors)
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", nil)
		return
	}

	// Verify password
	if err := h.passwordService.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		respondWithError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", nil)
		return
	}

	// Check if 2FA is enabled
	if user.TOTPEnabled && user.TOTPSecret != nil {
		// 2FA is enabled - require TOTP code
		if req.TOTPCode == nil || *req.TOTPCode == "" {
			// Return special response indicating 2FA is required
			respondWithSuccess(w, http.StatusOK, "2FA required", map[string]interface{}{
				"requires_2fa": true,
				"totp_enabled": true,
			})
			return
		}

		// Validate TOTP code
		if !h.totpService.ValidateCode(*user.TOTPSecret, *req.TOTPCode) {
			respondWithError(w, http.StatusUnauthorized, "INVALID_2FA_CODE", "Invalid 2FA code", nil)
			return
		}
	}

	// Generate JWT token
	token, err := h.jwtService.GenerateToken(user.ID, user.Email, user.SubscriptionStatus)
	if err != nil {
		log.Printf("Error generating token: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate authentication token", nil)
		return
	}

	// Update last login
	h.userRepo.UpdateLastLogin(user.ID)

	respondWithSuccess(w, http.StatusOK, "Login successful", AuthResponse{
		Token: token,
		User:  user,
	})
}

// validateRegistration validates registration input
func (h *AuthHandler) validateRegistration(req *RegisterRequest) []map[string]interface{} {
	var errors []map[string]interface{}

	if req.Email == "" {
		errors = append(errors, map[string]interface{}{"field": "email", "issue": "required"})
	} else if !isValidEmail(req.Email) {
		errors = append(errors, map[string]interface{}{"field": "email", "issue": "invalid email format"})
	}

	if req.Password == "" {
		errors = append(errors, map[string]interface{}{"field": "password", "issue": "required"})
	} else if len(req.Password) < 8 {
		errors = append(errors, map[string]interface{}{"field": "password", "issue": "must be at least 8 characters"})
	}

	if req.FullName == "" {
		errors = append(errors, map[string]interface{}{"field": "full_name", "issue": "required"})
	}

	if len(errors) > 0 {
		return errors
	}
	return nil
}

// validateLogin validates login input
func (h *AuthHandler) validateLogin(req *LoginRequest) []map[string]interface{} {
	var errors []map[string]interface{}

	if req.Email == "" {
		errors = append(errors, map[string]interface{}{"field": "email", "issue": "required"})
	}

	if req.Password == "" {
		errors = append(errors, map[string]interface{}{"field": "password", "issue": "required"})
	}

	if len(errors) > 0 {
		return errors
	}
	return nil
}

// isValidEmail performs basic email validation
func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

// ChangePasswordRequest represents the password change request payload
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword handles password change for authenticated users
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	// Get user ID from JWT context
	userID, ok := r.Context().Value("user_id").(uint64)
	if !ok {
		respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated", nil)
		return
	}

	// Parse request
	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	// Validate input
	if errors := h.validatePasswordChange(&req); errors != nil {
		respondWithError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Password change validation failed", errors)
		return
	}

	// Get user from database
	user, err := h.userRepo.GetByID(userID)
	if err != nil {
		log.Printf("Error fetching user: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch user", nil)
		return
	}

	// Verify current password
	if err := h.passwordService.VerifyPassword(user.PasswordHash, req.CurrentPassword); err != nil {
		respondWithError(w, http.StatusUnauthorized, "INVALID_PASSWORD", "Current password is incorrect", nil)
		return
	}

	// Hash new password
	newHash, err := h.passwordService.HashPassword(req.NewPassword)
	if err != nil {
		log.Printf("Error hashing new password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to hash password", nil)
		return
	}

	// Update password in database
	if err := h.userRepo.UpdatePassword(userID, newHash); err != nil {
		log.Printf("Error updating password: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update password", nil)
		return
	}

	respondWithSuccess(w, http.StatusOK, "Password changed successfully", map[string]interface{}{
		"success": true,
	})
}

// validatePasswordChange validates password change input
func (h *AuthHandler) validatePasswordChange(req *ChangePasswordRequest) []map[string]interface{} {
	var errors []map[string]interface{}

	if req.CurrentPassword == "" {
		errors = append(errors, map[string]interface{}{"field": "current_password", "issue": "required"})
	}

	if req.NewPassword == "" {
		errors = append(errors, map[string]interface{}{"field": "new_password", "issue": "required"})
	} else if len(req.NewPassword) < 8 {
		errors = append(errors, map[string]interface{}{"field": "new_password", "issue": "must be at least 8 characters"})
	}

	if req.CurrentPassword == req.NewPassword {
		errors = append(errors, map[string]interface{}{"field": "new_password", "issue": "must be different from current password"})
	}

	if len(errors) > 0 {
		return errors
	}
	return nil
}
