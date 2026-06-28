import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'
import type { 
  APIResponse, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest,
  LiveDeviceData 
} from '../types/api'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('risafrica-auth-storage')
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch (e) {
      console.error('Failed to parse auth storage:', e)
    }
  }
  return config
})

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<APIResponse>) => {
    // Handle 402 Payment Required - subscription lockout
    if (error.response?.status === 402) {
      const message = error.response.data?.error?.message || 
                     'Active subscription required to access this resource. Please update your payment method.'
      
      toast.error('Subscription Required', {
        description: message,
        duration: 6000,
        action: {
          label: 'Manage Subscription',
          onClick: () => window.location.href = '/settings'
        }
      })
      
      // Dispatch custom event for subscription lockout
      window.dispatchEvent(new CustomEvent('subscription-lockout', {
        detail: error.response.data
      }))
    }
    
    // Handle 401 Unauthorized - clear auth and redirect to login
    if (error.response?.status === 401) {
      toast.error('Session Expired', {
        description: 'Your session has expired. Please log in again.'
      })
      localStorage.removeItem('risafrica-auth-storage')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// Mock login data for development
const DEMO_CREDENTIALS = {
  email: 'john.doe@example.com',
  password: 'password123'
}

const createMockUser = (email: string): LoginResponse => {
  const now = new Date().toISOString()
  return {
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: 1,
      email: email,
      full_name: 'John Doe',
      subscription_status: 'active',
      paystack_customer_code: null,
      paystack_subscription_code: null,
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      created_at: now,
      updated_at: now,
      last_login_at: now,
    }
  }
}

// Auth API
export const authAPI = {
  login: async (credentials: LoginRequest) => {
    try {
      const response = await api.post<APIResponse<LoginResponse>>('/auth/login', credentials)
      return response.data.data!
    } catch (error) {
      // If API fails and using demo credentials, use mock login
      const isDemoCredentials = 
        credentials.email === DEMO_CREDENTIALS.email && 
        credentials.password === DEMO_CREDENTIALS.password
      
      if (isDemoCredentials) {
        console.warn('🔧 Using mock login (backend not available)')
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        return createMockUser(credentials.email)
      }
      
      // If not demo credentials, throw the original error
      throw error
    }
  },
  
  register: async (data: RegisterRequest) => {
    const response = await api.post<APIResponse<LoginResponse>>('/auth/register', data)
    return response.data.data!
  },
}

// Device API
export const deviceAPI = {
  getLiveData: async (deviceId: string) => {
    const response = await api.get<APIResponse<LiveDeviceData>>(`/devices/${deviceId}/live`)
    return response.data.data!
  },
}

export default api
