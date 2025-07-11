/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import type { IMUData } from '@/types/IMU'

export const permission = ref<string | null>(null);
export const interval = ref<number | null>(null);
export const currentIMUReading = ref<IMUData | null>(null);

export async function requestPermission(): Promise<boolean> {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as any).requestPermission === 'function'
  ) {
    permission.value = await (DeviceMotionEvent as any).requestPermission();
    if (permission.value !== 'granted') {
      throw new Error('Permission denied for motion sensors');

    } else {
      setupIMUListener();
      return true
    }
  } else if (permission.value == 'granted') {
    setupIMUListener();
    return true
  }
  return false
}

export function getIMUData(): IMUData | null {
  return currentIMUReading.value;
}

export function getIMUInterval(): number | null {
  return interval.value;
}

function setupIMUListener() {
  window.addEventListener('devicemotion', (event) => {
    const acceleration = event.acceleration;
    const accelerationWithGravity = event.accelerationIncludingGravity;
    const rotationRate = event.rotationRate;

    const readIMUData: IMUData = {
      accelerometer: {
        x: acceleration?.x as number,
        y: acceleration?.y as number,
        z: acceleration?.z as number
      },
      accIncludeGravity: {
        x: accelerationWithGravity?.x as number,
        y: accelerationWithGravity?.y as number,
        z: accelerationWithGravity?.z as number
      },
      rotationRate: {
        alpha: rotationRate?.alpha as number,
        beta: rotationRate?.beta as number,
        gamma: rotationRate?.gamma as number
      },
    };
    interval.value = event.interval ?? 500;
    currentIMUReading.value = readIMUData;
  });
}
