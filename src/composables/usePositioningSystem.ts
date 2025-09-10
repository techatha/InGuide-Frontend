/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, watch } from 'vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useIMU } from '@/composables/useIMU'
import { useDeviceOrientation } from '@/composables/useDeviceOrientation'
import * as kf from '@/composables/useKalmanFilter'
import type { Acceleration, RotationRate, IMUData } from '@/types/IMU'
import type { Data, PredictionPayload, PredictionResponse, Probability } from '@/types/prediction'
import { submitPayload } from '@/services/PredictionService'
import { rotateToWorldFrame } from '@/utils/RotateToWorldFrame'

const gps = useGeolocation()
const imu = useIMU()
const orien = useDeviceOrientation()

const latestGPSLat = ref<number | null>(null)
const latestGPSLng = ref<number | null>(null)
const latestIMUData = ref<IMUData | null>(null)

const latestPrediction = ref<PredictionResponse | null>(null)
const isSubmittingPrediction = ref(false)

const imuBuffer: IMUData[] = []

const windowData = ref<Data[]>([])
let windowSize: number
let dataInterval: number

export async function init(
  interval: number = 500,
  window: number = 4000,
  predictInterval: number = 1000,
): Promise<boolean> {
  gps.init()
  imu.requestPermission()
  orien.requestPermission()

  windowSize = window
  dataInterval = interval

  watch([gps.lat, gps.lng], ([lat, lng]) => {
    if (lat != null && lng != null && (latestGPSLat.value != lat || latestGPSLng.value != lng)) {
      // console.log('gps read!');
      // console.log('new lat/lng: ', [lat, lng]);
      latestGPSLat.value = lat
      latestGPSLng.value = lng
      if (
        !kf.isInitialized() &&
        orien &&
        latestGPSLat.value != null &&
        latestGPSLng.value != null
      ) {
        const heading = orien.heading.value?  orien.heading.value : 0
        kf.init(lat, lng, (heading * Math.PI) / 180)
      }
    }
  })

  watch(orien.heading, (orien) => {
    if(latestGPSLat.value !== null && latestGPSLng.value !== null && orien !== null){
      kf.update(latestGPSLat.value, latestGPSLng.value, (orien * Math.PI) / 180)
    }
  })

 watch(imu.IMUReading, (imuData) => {
    if (imuData) {
      latestIMUData.value = imuData
      imuBuffer.push(imuData)
    }
  })

  // KF predict interval
  setInterval(() => {
    if (imuBuffer.length === 0) return
    // const dtMs = Date.now() - latestPredictionUpdate
    // const dt = dtMs / 1000
    const acc: Acceleration = imuBuffer.reduce((acc, curr) => ({
      x: acc.x + (curr.accelerometer.x ?? 0),
      y: acc.y + (curr.accelerometer.y ?? 0),
      z: acc.z + (curr.accelerometer.z ?? 0),
    }), { x: 0, y: 0, z: 0 })
    const gyro: RotationRate = imuBuffer.reduce((gyro, curr) => ({
      alpha: gyro.alpha + (curr.rotationRate.alpha ?? 0),
      beta: gyro.beta + (curr.rotationRate.beta ?? 0),
      gamma: gyro.gamma + (curr.rotationRate.gamma ?? 0),
    }), { alpha: 0, beta: 0, gamma: 0 })

    const worldAcc: Acceleration = rotateToWorldFrame(acc, gyro)

    // Convert gyro.alpha (deg/s) to radians per second for yaw rate
    const gyroYawRateRad = gyro.alpha ? (gyro.alpha * Math.PI) / 180 : 0

    kf.predict(
      latestPrediction.value?.prediction as number,
      worldAcc,
      2.0,
      latestPrediction.value?.probability as Probability,
      gyroYawRateRad,
    )
  }, 2000)

  setInterval(() => {
    pushDataIntoWindowFame()
  }, interval)

  setTimeout(() => {
    setInterval(async () => {
      await getPrediction()
    }, predictInterval)
  }, 500)

  return true;
}

async function getPrediction() {
  if (isSubmittingPrediction.value) {
    // console.log('Prediction submission already in progress, skipping.');
    return
  }
  const payload: PredictionPayload = {
    interval: dataInterval,
    data: [...windowData.value],
  }
  isSubmittingPrediction.value = true
  try {
    const response = await submitPayload(payload)
    latestPrediction.value = response
  } catch (err: any) {
    console.log('Prediction error :', err)
  } finally {
    isSubmittingPrediction.value = false
  }
}

export function getPredictionResult() {
  return latestPrediction.value
}

export function getPosition(): [number, number] {
  return kf.getLatLng();
}

export function getRadHeading(): number {
  return kf.getRadHeading();
}

function pushDataIntoWindowFame() {
  const safe = (val: number | undefined | null) => val ?? 0

  const data: Data = {
    timestamp: Date.now(),
    acc_x: safe(latestIMUData.value?.accelerometer.x),
    acc_y: safe(latestIMUData.value?.accelerometer.y),
    acc_z: safe(latestIMUData.value?.accelerometer.z),
    acc_gx: safe(latestIMUData.value?.accIncludeGravity.x),
    acc_gy: safe(latestIMUData.value?.accIncludeGravity.y),
    acc_gz: safe(latestIMUData.value?.accIncludeGravity.z),
    gyro_x: safe(latestIMUData.value?.rotationRate.beta),
    gyro_y: safe(latestIMUData.value?.rotationRate.gamma),
    gyro_z: safe(latestIMUData.value?.rotationRate.alpha),
    gps_lat: safe(latestGPSLat.value),
    gps_lon: safe(latestGPSLng.value),
  }

  const dataSize = windowSize / dataInterval
  windowData.value.push(data)

  if (windowData.value.length > dataSize) {
    windowData.value.shift()
  }
}

export function isAvailable(): boolean {
  const isIMU = imu.permission.value != null
  const isGPS = gps.watcherId.value != null
  return isIMU && isGPS
}
