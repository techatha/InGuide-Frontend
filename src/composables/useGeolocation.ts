import { ref, onUnmounted } from 'vue'

const watcherId = ref<number | null>(null)

const lat = ref<number | null>(null)
const lng = ref<number | null>(null)

export { lat, lng }

export function init() {
  // Start watching position once (shared by whole app/module)
  watcherId.value = navigator.geolocation.watchPosition(
    (pos) => {
      lat.value = pos.coords.latitude
      lng.value = pos.coords.longitude
    },
    (err) => {
      console.log('GPS Error :(', err)
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
    },
  )
  // Clear the watcher when this module is unloaded (optional but clean)
  onUnmounted(() => {
    stopGPS()
  })
}

export function stopGPS() {
  if (watcherId.value !== null) {
    navigator.geolocation.clearWatch(watcherId.value)
    watcherId.value = null
  }
}
