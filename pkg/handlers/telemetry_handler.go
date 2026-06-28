package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// TelemetryHandler handles telemetry-related HTTP requests
type TelemetryHandler struct {
	db *sql.DB
}

// NewTelemetryHandler creates a new telemetry handler
func NewTelemetryHandler(db *sql.DB) *TelemetryHandler {
	return &TelemetryHandler{
		db: db,
	}
}

// TelemetryDataPoint represents a single telemetry data point for charts
type TelemetryDataPoint struct {
	Timestamp      string   `json:"timestamp"`
	WeightKg       int      `json:"weight_kg"`
	Latitude       float64  `json:"latitude"`
	Longitude      float64  `json:"longitude"`
	FuelLevel      *float64 `json:"fuel_level_liters,omitempty"`
	SpeedKmh       *float64 `json:"speed_kmh,omitempty"`
	ThrottleActive bool     `json:"ecu_throttle_active"`
}

// GetTelemetryHistory retrieves telemetry history for a device
// GET /api/devices/{device_id}/telemetry/history
func (h *TelemetryHandler) GetTelemetryHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	deviceID := vars["device_id"]

	// Parse query parameters
	hoursParam := r.URL.Query().Get("hours")
	hours := 24 // default to 24 hours
	if hoursParam != "" {
		if parsedHours, err := time.ParseDuration(hoursParam + "h"); err == nil {
			hours = int(parsedHours.Hours())
		}
	}

	// Limit maximum hours to prevent excessive data retrieval
	if hours > 168 { // 7 days max
		hours = 168
	}

	// Calculate time range
	endTime := time.Now().UTC()
	startTime := endTime.Add(-time.Duration(hours) * time.Hour)

	// Query telemetry data
	// For chart rendering, we'll sample the data to avoid overwhelming the frontend
	// If we have more than 100 data points, we'll aggregate by time intervals
	query := `
		SELECT 
			DATE_FORMAT(timestamp, '%Y-%m-%dT%H:%i:%s.000Z') as timestamp,
			AVG(weight_kg) as weight_kg,
			AVG(latitude) as latitude,
			AVG(longitude) as longitude,
			AVG(fuel_level_liters) as fuel_level_liters,
			AVG(speed_kmh) as speed_kmh,
			MAX(ecu_throttle_active) as ecu_throttle_active
		FROM telemetry
		WHERE device_id = ?
		  AND timestamp >= ?
		  AND timestamp <= ?
		GROUP BY UNIX_TIMESTAMP(timestamp) DIV ?
		ORDER BY timestamp ASC
		LIMIT 500
	`

	// Calculate interval for grouping (in seconds)
	// For 24 hours, group by 15 minutes (900 seconds) = ~96 points
	// For 168 hours (7 days), group by 2 hours (7200 seconds) = ~84 points
	interval := (hours * 3600) / 100 // Aim for ~100 data points
	if interval < 300 {
		interval = 300 // Minimum 5 minutes
	}

	rows, err := h.db.Query(query, deviceID, startTime, endTime, interval)
	if err != nil {
		log.Printf("Error querying telemetry history: %v", err)
		respondWithError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch telemetry data", nil)
		return
	}
	defer rows.Close()

	var dataPoints []TelemetryDataPoint
	for rows.Next() {
		var dp TelemetryDataPoint
		var fuelLevel, speedKmh sql.NullFloat64
		var throttleActive sql.NullBool

		err := rows.Scan(
			&dp.Timestamp,
			&dp.WeightKg,
			&dp.Latitude,
			&dp.Longitude,
			&fuelLevel,
			&speedKmh,
			&throttleActive,
		)
		if err != nil {
			log.Printf("Error scanning telemetry row: %v", err)
			continue
		}

		if fuelLevel.Valid {
			dp.FuelLevel = &fuelLevel.Float64
		}
		if speedKmh.Valid {
			dp.SpeedKmh = &speedKmh.Float64
		}
		if throttleActive.Valid {
			dp.ThrottleActive = throttleActive.Bool
		}

		dataPoints = append(dataPoints, dp)
	}

	// If no data found, return empty array instead of error
	if dataPoints == nil {
		dataPoints = []TelemetryDataPoint{}
	}

	respondWithSuccess(w, http.StatusOK, "Telemetry history retrieved successfully", map[string]interface{}{
		"device_id":   deviceID,
		"start_time":  startTime.Format(time.RFC3339),
		"end_time":    endTime.Format(time.RFC3339),
		"data_points": dataPoints,
		"count":       len(dataPoints),
	})
}
