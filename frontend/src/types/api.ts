// TypeScript interfaces matching Go API structures

export interface User {
  id: number
  email: string
  full_name: string
  subscription_status: 'active' | 'past_due' | 'canceled'
  paystack_customer_code: string | null
  paystack_subscription_code: string | null
  subscription_expires_at: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Device {
  device_id: string
  device_name: string
  hardware_tier: number
  truck_registration: string
  industry: string
  load_limit_kg: number
  throttle_enabled: boolean
  fuel_capacity_liters: number
  status: 'active' | 'inactive' | 'maintenance'
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trial'
  paystack_subscription_code: string | null
  subscription_expires_at: string | null
  monthly_price: number
  created_at: string
  updated_at: string
  last_seen_at: string | null
}

export interface TelemetryReading {
  timestamp: string
  weight_kg: number
  latitude: number
  longitude: number
  fuel_level_liters: number | null
  speed_kmh: number | null
  ecu_throttle_active: boolean
}

export interface LiveDeviceData {
  device_id: string
  reading: TelemetryReading
}

export interface APIResponse<T = any> {
  status: 'success' | 'error'
  message?: string
  data?: T
  error?: {
    code: string
    message: string
    details?: Array<{ field: string; issue: string }>
  }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
}

// Hardware Tier Classification
export type HardwareTier = 'Tier 1' | 'Tier 2' | 'Tier 3'

export interface DeviceWithTier extends Device {
  hardware_tier_label: HardwareTier
}

// Determine hardware tier based on available sensors
export function getHardwareTier(reading: TelemetryReading): HardwareTier {
  const hasFuel = reading.fuel_level_liters !== null
  const hasSpeed = reading.speed_kmh !== null
  
  if (hasFuel && hasSpeed) {
    return 'Tier 3' // Full suite: Leaf Spring + Air/Hydraulic + Fuel/Lidar
  } else if (hasSpeed) {
    return 'Tier 2' // Air/Hydraulic suspension
  } else {
    return 'Tier 1' // Basic Leaf Spring only
  }
}

// Fleet Status (per-device billing)
export interface FleetStatus {
  total_devices: number
  active_devices: number
  past_due_devices: number
  canceled_devices: number
  trial_devices: number
  total_monthly_cost: number
  overall_status: 'all_active' | 'partial' | 'inactive'
}

// Notification Preferences
export interface NotificationPreferences {
  user_id: number
  weight_limit_alerts: boolean
  device_offline_alerts: boolean
  weekly_reports: boolean
  email_notifications: boolean
  sms_notifications: boolean
  created_at: string
  updated_at: string
}
