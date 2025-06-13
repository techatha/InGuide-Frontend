import { ref, watch } from 'vue'
import * as gps from '@/composables/useGeolocation'
import * as imu from '@/composables/useIMU'
import type { IMUData } from '@/types/IMU'
import type { Prediction, PredictionPayload } from '@/types/prediction'
import { submitPayload } from '@/services/predictionService'

const latestGPSLat = ref<number | null>(null)
const latestGPSLng = ref<number | null>(null)
const latestIMUData = ref<IMUData | null>(null)

const windowData = ref<Prediction[]>([])
let windowSize: number
let dataInterval: number

export function init(interval: number = 500, window: number = 2000) {
  gps.init()
  imu.requestPermission()
  windowSize = window;
  dataInterval = interval;
  watch([gps.lat, gps.lng, imu.currentIMUReading], ([lat, lng, imu]) => {
    if (lat != null && lng != null) {
      // console.log('gps read!');
      // console.log('new lat/lng: ', [lat, lng]);
      latestGPSLat.value = lat
      latestGPSLng.value = lng
    }
    if (imu != null) {
      latestIMUData.value = imu
    }
    pushDataIntoWindowFame()
  })
}

export function getPrediction() {
  const payload: PredictionPayload = {
    interval: imu.getIMUInterval() as number,
    data: windowData.value,
  }
  const response = submitPayload(payload);
  return response;
}

export function getPosition(): [number, number] {
  return [latestGPSLat.value, latestGPSLng.value] as [number, number]
}

function pushDataIntoWindowFame() {
  const data: Prediction = {
    timestamp: Date.now(),
    acc_x: latestIMUData.value?.accelerometer.x as number,
    acc_y: latestIMUData.value?.accelerometer.y as number,
    acc_z: latestIMUData.value?.accelerometer.z as number,
    acc_gx: latestIMUData.value?.accIncludeGravity.x as number,
    acc_gy: latestIMUData.value?.accIncludeGravity.y as number,
    acc_gz: latestIMUData.value?.accIncludeGravity.z as number,
    gyro_x: latestIMUData.value?.rotationRate.beta as number,
    gyro_y: latestIMUData.value?.rotationRate.alpha as number,
    gyro_z: latestIMUData.value?.rotationRate.gamma as number,
    gps_lat: latestGPSLat.value as number,
    gps_lon: latestGPSLng.value as number,
  }
  const dataSize = windowSize / dataInterval

  windowData.value.push(data)
  if (windowData.value.length > dataSize) {
    windowData.value.shift()
  }
}
