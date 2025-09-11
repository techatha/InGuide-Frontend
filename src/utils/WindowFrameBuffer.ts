import { ref } from 'vue'
import type { IMUData } from '@/types/IMU'
import type { Data } from '@/types/prediction'

export function WindowFrameBuffer(windowSize: number = 1, interval: number = 500) {
  const windowData = ref<Data[]>([])

  function push(imu: IMUData | null, gpsLat: number | null, gpsLng: number | null) {
    const safe = (val: number | undefined | null) => val ?? 0

    const data: Data = {
      timestamp: Date.now(),
      acc_x: safe(imu?.accelerometer.x),
      acc_y: safe(imu?.accelerometer.y),
      acc_z: safe(imu?.accelerometer.z),
      acc_gx: safe(imu?.accIncludeGravity.x),
      acc_gy: safe(imu?.accIncludeGravity.y),
      acc_gz: safe(imu?.accIncludeGravity.z),
      gyro_x: safe(imu?.rotationRate.beta),
      gyro_y: safe(imu?.rotationRate.gamma),
      gyro_z: safe(imu?.rotationRate.alpha),
      gps_lat: safe(gpsLat),
      gps_lon: safe(gpsLng),
    }

    const maxSize = windowSize / interval
    windowData.value.push(data)
    if (windowData.value.length > maxSize) {
      windowData.value.shift()
    }
  }

  function getWindowData(): Data[] {
    return [...windowData.value]
  }

  function clear() {
    windowData.value = []
  }

  function setSize(window?: number, interv?: number){
    windowSize = window ?? windowSize
    interval = interv ?? interval
  }

  function getInterval(){
    return interval
  }

  return {
    push,
    getWindowData,
    clear,
    setSize,
    getInterval,
  }
}
