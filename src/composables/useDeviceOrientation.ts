/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'

const permission = ref<string | null>(null);
export const currentHeading = ref<number | null>(null);

export async function requestPermission(): Promise<void> {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  ) {
    permission.value = await (DeviceOrientationEvent as any).requestPermission();
    if (permission.value !== 'granted') {
      throw new Error('Permission denied for device orientation');
    } else {
      setupDeviceOrienListener();
    }
  } else if (permission.value == 'granted') {
    setupDeviceOrienListener();
  }
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
    currentHeading.value = event.alpha;
  })
}
