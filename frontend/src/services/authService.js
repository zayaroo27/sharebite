import api from './api.js'

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials)
  const data = response.data

  // Persist JWT token if provided by the backend
  if (data && data.token) {
    try {
      window.localStorage?.setItem('sharebite_jwt', data.token)
    } catch (_) {
      // Ignore storage errors; API calls will still work for this session
    }
  }

  return data
}

export async function register(payload) {
  const response = await api.post('/auth/register', payload)
  const data = response.data

  if (data && data.token) {
    try {
      window.localStorage?.setItem('sharebite_jwt', data.token)
    } catch (_) {
      // Ignore storage errors; API calls will still work for this session
    }
  }

  return data
}

export async function fetchCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

export async function fetchProfile() {
  const response = await api.get('/profile/me')
  return response.data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    // Swallow logout errors; UI will simply clear local state
  } finally {
    // Clear any stored JWT on logout
    try {
      window.localStorage?.removeItem('sharebite_jwt')
    } catch (_) {
      // Ignore storage errors
    }
  }
}

export async function updateProfile(payload) {
  const response = await api.put('/profile/me', payload)
  return response.data
}
