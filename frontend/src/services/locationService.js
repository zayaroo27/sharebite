const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
      ...options,
    })
  })
}

function pickLocationLabel(payload) {
  const address = payload?.address ?? {}
  const candidates = [
    address.suburb,
    address.neighbourhood,
    address.city_district,
    address.town,
    address.city,
    address.municipality,
    address.village,
    address.county,
    address.state_district,
    payload?.name,
    payload?.display_name,
  ]

  return candidates.find((value) => String(value || '').trim()) || ''
}

function getLocationErrorMessage(error) {
  if (!error) {
    return 'Unable to determine your current location right now.'
  }

  if (typeof error.code === 'number') {
    if (error.code === 1) return 'Location permission was denied. Please allow access and try again.'
    if (error.code === 2) return 'Your current location could not be determined.'
    if (error.code === 3) return 'Location lookup timed out. Please try again.'
  }

  return error.message || 'Unable to determine your current location right now.'
}

export async function getCurrentLocationLabel() {
  try {
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords

    const response = await fetch(
      `${NOMINATIM_ENDPOINT}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Unable to look up a readable location right now.')
    }

    const data = await response.json()
    const locationLabel = pickLocationLabel(data)

    if (!locationLabel) {
      throw new Error('Unable to find a readable area for your current location.')
    }

    return locationLabel
  } catch (error) {
    throw new Error(getLocationErrorMessage(error))
  }
}
