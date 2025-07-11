/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'

export const lat = ref<number | null>(null)
export const lng = ref<number | null>(null)
export const accuracy = ref<number | null>(null)
export const heading = ref<number | null>(null)
export const timestamp = ref<number | null>(null)

export const watcherId = ref<number | null>(null)

export function stopGPS(): boolean {
  if (watcherId.value !== null) {
    navigator.geolocation.clearWatch(watcherId.value)
    watcherId.value = null
    lat.value = null
    lng.value = null
    accuracy.value = null
    heading.value = null
    timestamp.value = null
    console.log('GPS watcher stopped.')
    return true
  }
  return false
}

export function init(): boolean {
  if (!('geolocation' in navigator)) {
    console.error('Geolocation is not supported by your browser.')
    return false
  }

  if (watcherId.value !== null) {
    console.warn('Geolocation watcher already initialized, skipping re-init.')
    return true
  }

  try {
    const newWatcherId = navigator.geolocation.watchPosition(
      (pos) => {
        lat.value = pos.coords.latitude
        lng.value = pos.coords.longitude
        accuracy.value = pos.coords.accuracy
        heading.value = pos.coords.heading
        timestamp.value = pos.timestamp
      },
      (err) => {
        console.error('GPS watch error:', err)
        lat.value = null; lng.value = null; accuracy.value = null;
        heading.value = null; timestamp.value = null;
        stopGPS();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    )
    watcherId.value = newWatcherId

    return true
  } catch (e: any) {
    console.error('Synchronous error starting GPS watch:', e)
    watcherId.value = null
    return false
  }
}
