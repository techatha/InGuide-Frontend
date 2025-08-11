/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import type { IMUData } from '@/types/IMU'

export const permission = ref<string | null>(null)
export const interval = ref<number | null>(null)
export const IMUReading = ref<IMUData> ({
  accelerometer: {
    x: 0,
    y: 0,
    z: 0,
  },
  accIncludeGravity: {
    x: 0,
    y: 0,
    z: 0,
  },
  rotationRate: {
    alpha: 0,
    beta: 0,
    gamma: 0,
  },
})
const alpha = 0.5

export async function requestPermission(): Promise<boolean> {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  ) {
    permission.value = await (DeviceMotionEvent as any).requestPermission()
    if (permission.value !== 'granted') {
      throw new Error('Permission denied for motion sensors')
    } else {
      setupIMUListener()
      return true
    }
  } else if (permission.value == 'granted') {
    setupIMUListener()
    return true
  }
  return false
}

export function getIMUData(): IMUData | null {
  return IMUReading.value
}

export function getIMUInterval(): number | null {
  return interval.value
}

function setupIMUListener() {
  window.addEventListener('devicemotion', (event) => {
    const acceleration = event.acceleration
    const accelerationWithGravity = event.accelerationIncludingGravity
    const rotationRate = event.rotationRate

    const acc = {
      x: acceleration?.x as number,
      y: acceleration?.y as number,
      z: acceleration?.z as number,
    }
    const accIncludeGravity = {
      x: accelerationWithGravity?.x as number,
      y: accelerationWithGravity?.y as number,
      z: accelerationWithGravity?.z as number,
    }

    const filteredData: IMUData = {
      accelerometer: {
        x: (alpha * acc.x) + ( (1 - alpha) * (IMUReading.value.accelerometer.x as number)),
        y: (alpha * acc.y) + ( (1 - alpha) * (IMUReading.value.accelerometer.y as number)),
        z: (alpha * acc.z) + ( (1 - alpha) * (IMUReading.value.accelerometer.z as number)),
      },
      accIncludeGravity: {
        x: (alpha * accIncludeGravity.x) + ( (1 - alpha) * (IMUReading.value.accIncludeGravity.x as number)),
        y: (alpha * accIncludeGravity.y) + ( (1 - alpha) * (IMUReading.value.accIncludeGravity.y as number)),
        z: (alpha * accIncludeGravity.z) + ( (1 - alpha) * (IMUReading.value.accIncludeGravity.z as number)),
      },
      rotationRate: {
        alpha: (alpha * (rotationRate?.alpha as number)) + ( (1 - alpha) * (IMUReading.value.rotationRate.alpha as number)),
        beta: (alpha * (rotationRate?.beta as number)) + ( (1 - alpha) * (IMUReading.value.rotationRate.beta as number)),
        gamma: (alpha * (rotationRate?.gamma as number)) + ( (1 - alpha) * (IMUReading.value.rotationRate.gamma as number)),
      },
    }
    interval.value = event.interval ?? 500
    IMUReading.value = filteredData

    // console.log("filtered", IMUReading)
  })
}

// import {rotateToWorldFrame} from '@/composables/usePositioningSystem'
// setInterval(() => {
//   console.log("raw dat", currentIMUReading.value)
//   console.log("rotated", rotateToWorldFrame(currentIMUReading.value?.accelerometer, currentIMUReading.value?.rotationRate))
// }, 1000)
