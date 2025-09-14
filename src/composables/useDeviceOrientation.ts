/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'

export function useDeviceOrientation() {
  const alpha = ref<number | null>(null)
  const beta = ref<number | null>(null)
  const gamma = ref<number | null>(null)
  const heading = ref<number | null>(null)
  let listener: ((e: DeviceOrientationEvent) => void) | null = null
  const permission = ref<string | null>(null)

  async function requestPermission(){
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      permission.value = await (DeviceOrientationEvent as any).requestPermission()
      // console.log("orien", permission.value)
      if (permission.value !== 'granted') throw new Error('Permission denied')
    }

    setupListener()
    permission.value = 'granted'
  }

  function setupListener() {
    // console.log("orien listener set")
    listener = (event: DeviceOrientationEvent) => {
      // console.log("yep yep", event.alpha)
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
    permission,
  }
}
