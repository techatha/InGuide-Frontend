/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'

export const permission = ref<string | null>(null);
export const currentHeading = ref<number | null>(null);
export const alpha = ref<number | null>(null); // yaw
export const beta = ref<number | null>(null);  // pitch
export const gamma = ref<number | null>(null); // roll

export async function requestPermission(): Promise<boolean> {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  ) {
    permission.value = await (DeviceOrientationEvent as any).requestPermission();
    if (permission.value !== 'granted') {
      throw new Error('Permission denied for device orientation');
    } else {
      setupDeviceOrienListener();
      return true
    }
  } else if (permission.value == 'granted') {
    setupDeviceOrienListener();
    return true
  }
  return false
}

export function getCurrentHeading(): number {
  if(currentHeading.value != null){
    return currentHeading.value as number
  } else {
    return 0
  }
}

function setupDeviceOrienListener() {
  window.addEventListener('deviceorientation', (event) => {
    alpha.value = event.alpha;
    beta.value = event.beta;
    gamma.value = event.gamma;
    currentHeading.value = event.alpha;
  })
}

export function isAvailable(): boolean {
  if(currentHeading.value != null){
    return true
  }
  return false
}
