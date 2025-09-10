/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'

export function useDeviceOrientation() {
  const alpha = ref<number | null>(null)
  const beta = ref<number | null>(null)
  const gamma = ref<number | null>(null)
  const heading = ref<number | null>(null)
  let listener: ((e: DeviceOrientationEvent) => void) | null = null

  async function requestPermission(): Promise<boolean> {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      const perm = await (DeviceOrientationEvent as any).requestPermission()
      if (perm !== 'granted') throw new Error('Permission denied')
      setupListener()
      return true
    } else {
      setupListener()
      return true
    }
  }

  function setupListener() {
    listener = (event: DeviceOrientationEvent) => {
      alpha.value = event.alpha
      beta.value = event.beta
      gamma.value = event.gamma
      heading.value = event.alpha
    }
    window.addEventListener('deviceorientation', listener)
  }

  function stop() {
    if (listener) {
      window.removeEventListener('deviceorientation', listener)
      listener = null
    }
  }
  function isAvailable(): boolean {
    if (heading.value != null) {
      return true
    }
    return false
  }

  return {
    alpha,
    beta,
    gamma,
    heading,
    requestPermission,
    stop,
    isAvailable,
  }
}
