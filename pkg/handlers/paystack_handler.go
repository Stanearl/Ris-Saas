package handlers

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"iot-telemetry-platform/pkg/models"
	"iot-telemetry-platform/pkg/repository"
)

// PaystackHandler handles Paystack webhook events
type PaystackHandler struct {
	userRepo         repository.UserRepository
	subscriptionRepo repository.SubscriptionRepository
	secretKey        string
}

// NewPaystackHandler creates a new Paystack webhook handler
func NewPaystackHandler(
	userRepo repository.UserRepository,
	subscriptionRepo repository.SubscriptionRepository,
	secretKey string,
) *PaystackHandler {
	return &PaystackHandler{
		userRepo:         userRepo,
		subscriptionRepo: subscriptionRepo,
		secretKey:        secretKey,
	}
}

// PaystackWebhookPayload represents the Paystack webhook payload structure
type PaystackWebhookPayload struct {
	Event string                 `json:"event"`
	Data  map[string]interface{} `json:"data"`
}

// HandleWebhook processes Paystack webhook events
func (h *PaystackHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Failed to read request body", nil)
		return
	}

	// Verify Paystack signature
	signature := r.Header.Get("X-Paystack-Signature")
	if !h.verifySignature(body, signature) {
		log.Printf("Invalid Paystack signature")
		respondWithError(w, http.StatusUnauthorized, "INVALID_SIGNATURE", "Invalid webhook signature", nil)
		return
	}

	// Parse webhook payload
	var payload PaystackWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("Error parsing webhook payload: %v", err)
		respondWithError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid JSON payload", nil)
		return
	}

	log.Printf("Received Paystack webhook event: %s", payload.Event)

	// Handle different event types
	switch payload.Event {
	case "charge.success":
		h.handleChargeSuccess(payload.Data)
	case "invoice.payment_failed":
		h.handlePaymentFailed(payload.Data)
	case "subscription.create":
		h.handleSubscriptionCreate(payload.Data)
	case "subscription.disable":
		h.handleSubscriptionDisable(payload.Data)
	default:
		log.Printf("Unhandled webhook event: %s", payload.Event)
	}

	// Always return 200 OK to acknowledge receipt
	respondWithSuccess(w, http.StatusOK, "Webhook processed", map[string]interface{}{
		"event":      payload.Event,
		"processed":  true,
		"timestamp":  time.Now().UTC(),
	})
}

// handleChargeSuccess processes successful payment events
func (h *PaystackHandler) handleChargeSuccess(data map[string]interface{}) {
	log.Printf("Processing charge.success event")

	// Extract customer email
	customer, ok := data["customer"].(map[string]interface{})
	if !ok {
		log.Printf("Invalid customer data in webhook")
		return
	}

	email, ok := customer["email"].(string)
	if !ok {
		log.Printf("Missing customer email in webhook")
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(email)
	if err != nil {
		log.Printf("User not found for email %s: %v", email, err)
		return
	}

	// Extract payment details
	amount := 0.0
	if amountVal, ok := data["amount"].(float64); ok {
		amount = amountVal / 100 // Paystack returns amount in kobo
	}

	currency := "NGN"
	if currencyVal, ok := data["currency"].(string); ok {
		currency = currencyVal
	}

	// Update subscription status to active
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days from now
	if err := h.userRepo.UpdateSubscriptionStatus(user.ID, models.SubscriptionStatusActive, &expiresAt); err != nil {
		log.Printf("Error updating subscription status: %v", err)
		return
	}

	// Extract Paystack codes
	customerCode, _ := customer["customer_code"].(string)
	subscriptionCode := ""
	if subscription, ok := data["subscription"].(map[string]interface{}); ok {
		if code, ok := subscription["subscription_code"].(string); ok {
			subscriptionCode = code
		}
	}

	// Update Paystack info
	if customerCode != "" {
		h.userRepo.UpdatePaystackInfo(user.ID, &customerCode, &subscriptionCode)
	}

	// Log the event
	eventID := ""
	if id, ok := data["id"].(string); ok {
		eventID = id
	}

	event := &models.SubscriptionEvent{
		UserID:           user.ID,
		EventType:        "charge.success",
		PaystackEventID:  &eventID,
		SubscriptionCode: &subscriptionCode,
		Amount:           &amount,
		Currency:         currency,
		Status:           stringPtr("success"),
		Metadata:         data,
	}

	if err := h.subscriptionRepo.LogEvent(event); err != nil {
		log.Printf("Error logging subscription event: %v", err)
	}

	log.Printf("Successfully processed charge.success for user %s (ID: %d)", email, user.ID)
}

// handlePaymentFailed processes failed payment events
func (h *PaystackHandler) handlePaymentFailed(data map[string]interface{}) {
	log.Printf("Processing invoice.payment_failed event")

	// Extract customer email
	customer, ok := data["customer"].(map[string]interface{})
	if !ok {
		log.Printf("Invalid customer data in webhook")
		return
	}

	email, ok := customer["email"].(string)
	if !ok {
		log.Printf("Missing customer email in webhook")
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(email)
	if err != nil {
		log.Printf("User not found for email %s: %v", email, err)
		return
	}

	// Update subscription status to past_due
	if err := h.userRepo.UpdateSubscriptionStatus(user.ID, models.SubscriptionStatusPastDue, nil); err != nil {
		log.Printf("Error updating subscription status: %v", err)
		return
	}

	// Extract payment details
	amount := 0.0
	if amountVal, ok := data["amount"].(float64); ok {
		amount = amountVal / 100
	}

	currency := "NGN"
	if currencyVal, ok := data["currency"].(string); ok {
		currency = currencyVal
	}

	// Log the event
	eventID := ""
	if id, ok := data["id"].(string); ok {
		eventID = id
	}

	event := &models.SubscriptionEvent{
		UserID:          user.ID,
		EventType:       "invoice.payment_failed",
		PaystackEventID: &eventID,
		Amount:          &amount,
		Currency:        currency,
		Status:          stringPtr("failed"),
		Metadata:        data,
	}

	if err := h.subscriptionRepo.LogEvent(event); err != nil {
		log.Printf("Error logging subscription event: %v", err)
	}

	log.Printf("Successfully processed payment_failed for user %s (ID: %d)", email, user.ID)
}

// handleSubscriptionCreate processes subscription creation events
func (h *PaystackHandler) handleSubscriptionCreate(data map[string]interface{}) {
	log.Printf("Processing subscription.create event")

	// Extract customer email
	customer, ok := data["customer"].(map[string]interface{})
	if !ok {
		log.Printf("Invalid customer data in webhook")
		return
	}

	email, ok := customer["email"].(string)
	if !ok {
		log.Printf("Missing customer email in webhook")
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(email)
	if err != nil {
		log.Printf("User not found for email %s: %v", email, err)
		return
	}

	// Extract subscription code
	subscriptionCode := ""
	if code, ok := data["subscription_code"].(string); ok {
		subscriptionCode = code
	}

	customerCode := ""
	if code, ok := customer["customer_code"].(string); ok {
		customerCode = code
	}

	// Update Paystack info
	if customerCode != "" || subscriptionCode != "" {
		h.userRepo.UpdatePaystackInfo(user.ID, &customerCode, &subscriptionCode)
	}

	// Log the event
	event := &models.SubscriptionEvent{
		UserID:           user.ID,
		EventType:        "subscription.create",
		SubscriptionCode: &subscriptionCode,
		Currency:         "NGN",
		Status:           stringPtr("created"),
		Metadata:         data,
	}

	if err := h.subscriptionRepo.LogEvent(event); err != nil {
		log.Printf("Error logging subscription event: %v", err)
	}

	log.Printf("Successfully processed subscription.create for user %s (ID: %d)", email, user.ID)
}

// handleSubscriptionDisable processes subscription disable events
func (h *PaystackHandler) handleSubscriptionDisable(data map[string]interface{}) {
	log.Printf("Processing subscription.disable event")

	// Extract customer email
	customer, ok := data["customer"].(map[string]interface{})
	if !ok {
		log.Printf("Invalid customer data in webhook")
		return
	}

	email, ok := customer["email"].(string)
	if !ok {
		log.Printf("Missing customer email in webhook")
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(email)
	if err != nil {
		log.Printf("User not found for email %s: %v", email, err)
		return
	}

	// Update subscription status to canceled
	if err := h.userRepo.UpdateSubscriptionStatus(user.ID, models.SubscriptionStatusCanceled, nil); err != nil {
		log.Printf("Error updating subscription status: %v", err)
		return
	}

	// Log the event
	subscriptionCode := ""
	if code, ok := data["subscription_code"].(string); ok {
		subscriptionCode = code
	}

	event := &models.SubscriptionEvent{
		UserID:           user.ID,
		EventType:        "subscription.disable",
		SubscriptionCode: &subscriptionCode,
		Currency:         "NGN",
		Status:           stringPtr("disabled"),
		Metadata:         data,
	}

	if err := h.subscriptionRepo.LogEvent(event); err != nil {
		log.Printf("Error logging subscription event: %v", err)
	}

	log.Printf("Successfully processed subscription.disable for user %s (ID: %d)", email, user.ID)
}

// verifySignature verifies the Paystack webhook signature
func (h *PaystackHandler) verifySignature(payload []byte, signature string) bool {
	mac := hmac.New(sha512.New, []byte(h.secretKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	return &s
}
