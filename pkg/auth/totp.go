package auth

import (
	"bytes"
	"encoding/base64"
	"image/png"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// TOTPService handles TOTP operations
type TOTPService interface {
	GenerateSecret(email string) (*otp.Key, error)
	GenerateQRCode(key *otp.Key) (string, error)
	ValidateCode(secret, code string) bool
}

type totpService struct {
	issuer string
}

// NewTOTPService creates a new TOTP service
func NewTOTPService(issuer string) TOTPService {
	return &totpService{
		issuer: issuer,
	}
}

// GenerateSecret generates a new TOTP secret for a user
func (s *totpService) GenerateSecret(email string) (*otp.Key, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.issuer,
		AccountName: email,
	})
	if err != nil {
		return nil, err
	}
	return key, nil
}

// GenerateQRCode generates a base64-encoded QR code image
func (s *totpService) GenerateQRCode(key *otp.Key) (string, error) {
	// Generate QR code image
	img, err := key.Image(200, 200)
	if err != nil {
		return "", err
	}

	// Encode image to PNG
	var buf bytes.Buffer
	err = png.Encode(&buf, img)
	if err != nil {
		return "", err
	}

	// Convert to base64
	base64Img := base64.StdEncoding.EncodeToString(buf.Bytes())
	return "data:image/png;base64," + base64Img, nil
}

// ValidateCode validates a TOTP code against a secret
func (s *totpService) ValidateCode(secret, code string) bool {
	return totp.Validate(code, secret)
}
