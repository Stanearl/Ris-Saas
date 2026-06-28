/**
 * Cloudflare Worker - IoT Telemetry API Gateway
 * 
 * This worker acts as an edge ingestion layer for fleet telemetry data.
 * It validates, authenticates, and forwards telemetry payloads to the Go backend.
 */

// Environment variables interface
interface Env {
  API_KEY: string;
  BACKEND_URL: string;
  BACKEND_TIMEOUT: string;
}

// Telemetry payload interfaces
interface SingleTelemetryPayload {
  device_id: string;
  timestamp: string;
  weight_kg: number;
  latitude: number;
  longitude: number;
  fuel_level_liters?: number;
  speed_kmh?: number;
  ecu_throttle_active: boolean;
}

interface BatchTelemetryPayload {
  device_id: string;
  readings: Array<Omit<SingleTelemetryPayload, 'device_id'>>;
}

type TelemetryPayload = SingleTelemetryPayload | BatchTelemetryPayload;

// Error response helper
function errorResponse(status: number, code: string, message: string, details?: any): Response {
  return new Response(
    JSON.stringify({
      status: 'error',
      error: {
        code,
        message,
        ...(details && { details }),
      },
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}

// Authentication middleware
function authenticate(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  // Check Bearer token
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === env.API_KEY) {
      return true;
    }
  }

  // Check API Key header
  if (apiKeyHeader && apiKeyHeader === env.API_KEY) {
    return true;
  }

  return false;
}

// Validate single telemetry payload
function validateSinglePayload(payload: any): { valid: boolean; errors: any[] } {
  const errors: any[] = [];

  // Required fields validation
  if (!payload.device_id || typeof payload.device_id !== 'string') {
    errors.push({ field: 'device_id', issue: 'required and must be a string' });
  } else if (payload.device_id.length > 50) {
    errors.push({ field: 'device_id', issue: 'must not exceed 50 characters' });
  }

  if (!payload.timestamp || typeof payload.timestamp !== 'string') {
    errors.push({ field: 'timestamp', issue: 'required and must be a valid ISO 8601 timestamp' });
  } else {
    const timestamp = new Date(payload.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push({ field: 'timestamp', issue: 'must be a valid ISO 8601 timestamp' });
    }
  }

  if (payload.weight_kg === undefined || payload.weight_kg === null) {
    errors.push({ field: 'weight_kg', issue: 'required' });
  } else if (typeof payload.weight_kg !== 'number' || payload.weight_kg < 0) {
    errors.push({ field: 'weight_kg', issue: 'must be a non-negative number' });
  }

  if (payload.latitude === undefined || payload.latitude === null) {
    errors.push({ field: 'latitude', issue: 'required' });
  } else if (typeof payload.latitude !== 'number' || payload.latitude < -90 || payload.latitude > 90) {
    errors.push({ field: 'latitude', issue: 'must be a number between -90 and 90' });
  }

  if (payload.longitude === undefined || payload.longitude === null) {
    errors.push({ field: 'longitude', issue: 'required' });
  } else if (typeof payload.longitude !== 'number' || payload.longitude < -180 || payload.longitude > 180) {
    errors.push({ field: 'longitude', issue: 'must be a number between -180 and 180' });
  }

  if (payload.ecu_throttle_active === undefined || payload.ecu_throttle_active === null) {
    errors.push({ field: 'ecu_throttle_active', issue: 'required' });
  } else if (typeof payload.ecu_throttle_active !== 'boolean') {
    errors.push({ field: 'ecu_throttle_active', issue: 'must be a boolean' });
  }

  // Optional fields validation
  if (payload.fuel_level_liters !== undefined && payload.fuel_level_liters !== null) {
    if (typeof payload.fuel_level_liters !== 'number' || payload.fuel_level_liters < 0) {
      errors.push({ field: 'fuel_level_liters', issue: 'must be a non-negative number' });
    }
  }

  if (payload.speed_kmh !== undefined && payload.speed_kmh !== null) {
    if (typeof payload.speed_kmh !== 'number' || payload.speed_kmh < 0) {
      errors.push({ field: 'speed_kmh', issue: 'must be a non-negative number' });
    }
  }

  return { valid: errors.length === 0, errors };
}

// Validate batch telemetry payload
function validateBatchPayload(payload: any): { valid: boolean; errors: any[] } {
  const errors: any[] = [];

  // Check device_id
  if (!payload.device_id || typeof payload.device_id !== 'string') {
    errors.push({ field: 'device_id', issue: 'required and must be a string' });
  } else if (payload.device_id.length > 50) {
    errors.push({ field: 'device_id', issue: 'must not exceed 50 characters' });
  }

  // Check readings array
  if (!payload.readings || !Array.isArray(payload.readings)) {
    errors.push({ field: 'readings', issue: 'required and must be an array' });
    return { valid: false, errors };
  }

  if (payload.readings.length === 0) {
    errors.push({ field: 'readings', issue: 'must contain at least 1 reading' });
  }

  if (payload.readings.length > 100) {
    errors.push({ field: 'readings', issue: 'must not exceed 100 readings' });
  }

  // Validate each reading
  payload.readings.forEach((reading: any, index: number) => {
    const readingValidation = validateSinglePayload({ ...reading, device_id: payload.device_id });
    if (!readingValidation.valid) {
      readingValidation.errors.forEach((error) => {
        errors.push({
          field: `readings[${index}].${error.field}`,
          issue: error.issue,
        });
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

// Validate telemetry payload (single or batch)
function validatePayload(payload: any): { valid: boolean; errors: any[] } {
  // Determine if it's a batch or single payload
  if (payload.readings && Array.isArray(payload.readings)) {
    return validateBatchPayload(payload);
  } else {
    return validateSinglePayload(payload);
  }
}

// Forward payload to Go backend
async function forwardToBackend(
  payload: TelemetryPayload,
  env: Env
): Promise<Response> {
  const backendUrl = env.BACKEND_URL || 'https://api.ris.africa/telemetry';
  const timeout = parseInt(env.BACKEND_TIMEOUT || '30000', 10);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-By': 'Cloudflare-Worker',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Return the backend response as-is
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'X-Processed-By': 'Cloudflare-Worker',
      },
    });
  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      return errorResponse(
        504,
        'GATEWAY_TIMEOUT',
        'Request to backend timed out. Please retry.'
      );
    }

    // Handle network errors
    console.error('Backend forwarding error:', error);
    return errorResponse(
      502,
      'BAD_GATEWAY',
      'Failed to connect to backend service. Please retry.'
    );
  }
}

// Main request handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Only POST requests are allowed');
    }

    // Check Content-Type
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json'
      );
    }

    // Authentication
    if (!authenticate(request, env)) {
      return errorResponse(
        401,
        'UNAUTHORIZED',
        'Invalid or missing authentication credentials'
      );
    }

    // Parse JSON payload
    let payload: any;
    try {
      payload = await request.json();
    } catch (error) {
      return errorResponse(
        400,
        'INVALID_JSON',
        'Request body must be valid JSON'
      );
    }

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return errorResponse(
        400,
        'INVALID_PAYLOAD',
        'Invalid request payload',
        validation.errors
      );
    }

    // Forward to backend
    return await forwardToBackend(payload, env);
  },
};
