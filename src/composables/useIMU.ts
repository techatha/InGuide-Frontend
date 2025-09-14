/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import type { IMUData } from '@/types/IMU'

export function useIMU(alpha = 0.5) {
  const permission = ref<string | null>(null)
  const interval = ref<number | null>(null)
  const IMUReading = ref<IMUData>({
    accelerometer: { x: 0, y: 0, z: 0 },
    accIncludeGravity: { x: 0, y: 0, z: 0 },
    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
  })

  let listener: ((event: DeviceMotionEvent) => void) | null = null

  async function requestPermission(): Promise<boolean> {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      permission.value = await (DeviceMotionEvent as any).requestPermission()
      if (permission.value !== 'granted') throw new Error('Permission denied')
    }
    setupListener()

    return true
  }

  function setupListener() {
    listener = (event: DeviceMotionEvent) => {
      const acc = event.acceleration
      const accG = event.accelerationIncludingGravity
      const rot = event.rotationRate

      IMUReading.value = {
        accelerometer: {
          x: alpha * (acc?.x ?? 0) + (1 - alpha) * (IMUReading.value.accelerometer.x as number),
          y: alpha * (acc?.y ?? 0) + (1 - alpha) * (IMUReading.value.accelerometer.y as number),
          z: alpha * (acc?.z ?? 0) + (1 - alpha) * (IMUReading.value.accelerometer.z as number),
        },
        accIncludeGravity: {
          x: alpha * (accG?.x ?? 0) + (1 - alpha) * (IMUReading.value.accIncludeGravity.x as number),
          y: alpha * (accG?.y ?? 0) + (1 - alpha) * (IMUReading.value.accIncludeGravity.y as number),
          z: alpha * (accG?.z ?? 0) + (1 - alpha) * (IMUReading.value.accIncludeGravity.z as number),
        },
        rotationRate: {
          alpha: alpha * (rot?.alpha ?? 0) + (1 - alpha) * (IMUReading.value.rotationRate.alpha as number),
          beta: alpha * (rot?.beta ?? 0) + (1 - alpha) * (IMUReading.value.rotationRate.beta as number),
          gamma: alpha * (rot?.gamma ?? 0) + (1 - alpha) * (IMUReading.value.rotationRate.gamma as number),
        },
      }
      interval.value = event.interval ?? 500
    }
    window.addEventListener('devicemotion', listener!)
  }

  function stop() {
    if (listener) {
      window.removeEventListener('devicemotion', listener)
      listener = null
    }
  }

  function getIMUData(): IMUData {
    return IMUReading.value
  }

  return {
    IMUReading,
    interval,
    permission,
    requestPermission,
    stop,
    getIMUData,
  }
}
