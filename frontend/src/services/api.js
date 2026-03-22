import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

// Optional: attach Authorization header if a JWT token is available.
// This assumes your app stores a token string under `sharebite_jwt` in
// memory, localStorage, or another shared module. Adjust as needed to
// match your actual token storage.
api.interceptors.request.use((config) => {
  try {
    const token = window.localStorage?.getItem('sharebite_jwt')

    if (token) {
      // Do not override an explicitly set Authorization header
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    // Access to localStorage may fail in some environments; ignore gracefully
  }

  return config
})

// Basic response interceptor: handle 401 Unauthorized globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      try {
        // Clear any stored token if present
        window.localStorage?.removeItem('sharebite_jwt')
      } catch (_) {
        // Ignore storage errors
      }
    }

    return Promise.reject(error)
  },
)

export default api

