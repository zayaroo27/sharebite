import api from './api.js'

export async function fetchListings() {
  const response = await api.get('/listings')
  return response.data
}

export async function fetchListingById(id) {
  const response = await api.get(`/listings/${id}`)
  return response.data
}

export async function fetchCategories() {
  const response = await api.get('/categories')
  return response.data ?? []
}

export async function createListing(payload) {
  const response = await api.post('/listings', payload)
  return response.data
}

export async function updateMyListing(id, payload) {
  const response = await api.put(`/listings/${id}`, payload)
  return response.data
}

export async function deleteMyListing(id) {
  await api.delete(`/listings/${id}`)
}

export async function uploadListingImage(id, file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post(`/listings/${id}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
