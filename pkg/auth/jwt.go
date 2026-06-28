package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID               uint64 `json:"user_id"`
	Email                string `json:"email"`
	SubscriptionStatus   string `json:"subscription_status"`
	jwt.RegisteredClaims
}

// JWTService handles JWT token operations
type JWTService interface {
	GenerateToken(userID uint64, email, subscriptionStatus string) (string, error)
	ValidateToken(tokenString string) (*JWTClaims, error)
}

type jwtService struct {
	secretKey     []byte
	issuer        string
	tokenDuration time.Duration
}

// NewJWTService creates a new JWT service instance
func NewJWTService(secretKey, issuer string, tokenDuration time.Duration) JWTService {
	return &jwtService{
		secretKey:     []byte(secretKey),
		issuer:        issuer,
		tokenDuration: tokenDuration,
	}
}

// GenerateToken creates a new JWT token for a user
func (s *jwtService) GenerateToken(userID uint64, email, subscriptionStatus string) (string, error) {
	claims := JWTClaims{
		UserID:             userID,
		Email:              email,
		SubscriptionStatus: subscriptionStatus,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    s.issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates and parses a JWT token
func (s *jwtService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
