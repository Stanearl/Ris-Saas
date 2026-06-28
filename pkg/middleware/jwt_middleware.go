package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"iot-telemetry-platform/pkg/auth"
	"iot-telemetry-platform/pkg/models"
)

// ContextKey is a custom type for context keys
type ContextKey string

const (
	// UserClaimsKey is the context key for JWT claims
	UserClaimsKey ContextKey = "user_claims"
)

// JWTMiddleware validates JWT tokens and adds claims to request context
type JWTMiddleware struct {
	jwtService auth.JWTService
}

// NewJWTMiddleware creates a new JWT middleware instance
func NewJWTMiddleware(jwtService auth.JWTService) *JWTMiddleware {
	return &JWTMiddleware{
		jwtService: jwtService,
	}
}

// Authenticate validates the JWT token and adds claims to context
func (m *JWTMiddleware) Authenticate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header", nil)
			return
		}

		// Check if it's a Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format", nil)
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := m.jwtService.ValidateToken(tokenString)
		if err != nil {
			log.Printf("Token validation error: %v", err)
			respondWithError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Invalid or expired token", nil)
			return
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

// RequireAuth validates JWT token and adds user_id to context
// Does not check subscription status
func (m *JWTMiddleware) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return m.Authenticate(func(w http.ResponseWriter, r *http.Request) {
		// Get claims from context
		claims, ok := r.Context().Value(UserClaimsKey).(*auth.JWTClaims)
		if !ok {
			respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authentication context", nil)
			return
		}

		// Add user_id to context for handlers to use
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		next(w, r.WithContext(ctx))
	})
}

// RequireActiveSubscription checks if the user has an active subscription
// Returns 402 Payment Required if subscription is not active
func (m *JWTMiddleware) RequireActiveSubscription(next http.HandlerFunc) http.HandlerFunc {
	return m.Authenticate(func(w http.ResponseWriter, r *http.Request) {
		// Get claims from context
		claims, ok := r.Context().Value(UserClaimsKey).(*auth.JWTClaims)
		if !ok {
			respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authentication context", nil)
			return
		}

		// Check subscription status
		if claims.SubscriptionStatus != models.SubscriptionStatusActive {
			log.Printf("User %d (%s) attempted to access protected resource with subscription status: %s",
				claims.UserID, claims.Email, claims.SubscriptionStatus)

			respondWithError(w, http.StatusPaymentRequired, "SUBSCRIPTION_REQUIRED",
				"Active subscription required to access this resource. Please update your payment method.", nil)
			return
		}

		// Add user_id to context for handlers to use
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		// Subscription is active, proceed
		next(w, r.WithContext(ctx))
	})
}

// respondWithError sends an error response (duplicated for middleware independence)
func respondWithError(w http.ResponseWriter, statusCode int, code, message string, details []map[string]interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	// Simple JSON response to avoid import cycles
	w.Write([]byte(`{"status":"error","error":{"code":"` + code + `","message":"` + message + `"}}`))
}
