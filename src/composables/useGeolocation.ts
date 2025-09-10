import { ref } from 'vue'

export function useGeolocation() {
  const lat = ref<number | null>(null)
  const lng = ref<number | null>(null)
  const accuracy = ref<number | null>(null)
  const heading = ref<number | null>(null)
  const timestamp = ref<number | null>(null)

  const watcherId = ref<number | null>(null)

  function init(): boolean {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.')
      console.error('Geolocation is not supported by your browser.')
      return false
    }

    try {
      watcherId.value = navigator.geolocation.watchPosition(
        (pos) => {
          lat.value = pos.coords.latitude
          lng.value = pos.coords.longitude
          accuracy.value = pos.coords.accuracy
          heading.value = pos.coords.heading
          timestamp.value = pos.timestamp
        },
        (err) => {
          console.error('GPS watch error:', err)
          lat.value = null
          lng.value = null
          accuracy.value = null
          heading.value = null
          timestamp.value = null
          stopGPS()
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      )

      return true
    } catch (e) {
      console.error('Synchronous error starting GPS watch:', e)
      watcherId.value = null
      return false
    }
  }

  function stopGPS() {
    if (watcherId.value !== null) {
      navigator.geolocation.clearWatch(watcherId.value)
      watcherId.value = null
      console.log('GPS watcher stopped.')
    }
  }

  return {
    watcherId,
    lat,
    lng,
    accuracy,
    heading,
    timestamp,
    init,
    stopGPS,
  }
}
