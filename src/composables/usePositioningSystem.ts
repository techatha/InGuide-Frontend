/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, watch } from 'vue'
import * as gps from '@/composables/useGeolocation'
import * as imu from '@/composables/useIMU'
import * as orien from '@/composables/useDeviceOrientation'
import * as kf from '@/composables/useKalmanFilter'
import type { Acceleration, RotationRate, IMUData } from '@/types/IMU'
import type { Data, PredictionPayload, PredictionResponse, Probability } from '@/types/prediction'
import { submitPayload } from '@/services/predictionService'
import { create, all } from 'mathjs'

const math = create(all)

const latestGPSLat = ref<number | null>(null)
const latestGPSLng = ref<number | null>(null)
const latestIMUData = ref<IMUData | null>(null)

const latestPrediction = ref<PredictionResponse | null>(null)
const isSubmittingPrediction = ref(false)
let latestPredictionUpdate: number

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

  watch([gps.lat, gps.lng, imu.currentIMUReading], ([lat, lng, imu]) => {
    if (lat != null && lng != null && (latestGPSLat.value != lat || latestGPSLng.value != lng)) {
      // console.log('gps read!');
      // console.log('new lat/lng: ', [lat, lng]);
      latestGPSLat.value = lat
      latestGPSLng.value = lng
      if (
        !kf.isInitialized() &&
        orien.isAvailable() &&
        latestGPSLat.value != null &&
        latestGPSLng.value != null
      ) {
        kf.init(lat, lng, (orien.getCurrentHeading() * Math.PI) / 180)
      }
      kf.update(lat, lng, (orien.getCurrentHeading() * Math.PI) / 180)
      latestPredictionUpdate = Date.now()
    }
    if (imu != null && latestIMUData.value != imu) {
      latestIMUData.value = imu
    }
  })

  setInterval(() => {
    const dtMs = Date.now() - latestPredictionUpdate
    const dt = dtMs / 1000
    const acc: Acceleration = latestIMUData.value?.accelerometer as Acceleration
    const gyro: RotationRate = latestIMUData.value?.rotationRate as RotationRate
    const worldAcc: Acceleration = rotateToWorldFrame(acc, gyro)

    // Convert gyro.alpha (deg/s) to radians per second for yaw rate
    const gyroYawRateRad = gyro.alpha ? (gyro.alpha * Math.PI) / 180 : 0

    kf.predict(
      latestPrediction.value?.prediction as number,
      worldAcc,
      dt,
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
  return [latestGPSLat.value, latestGPSLng.value] as [number, number]
}

function pushDataIntoWindowFame() {
  const data: Data = {
    timestamp: Date.now(),
    acc_x: latestIMUData.value?.accelerometer.x as number,
    acc_y: latestIMUData.value?.accelerometer.y as number,
    acc_z: latestIMUData.value?.accelerometer.z as number,
    acc_gx: latestIMUData.value?.accIncludeGravity.x as number,
    acc_gy: latestIMUData.value?.accIncludeGravity.y as number,
    acc_gz: latestIMUData.value?.accIncludeGravity.z as number,
    gyro_x: latestIMUData.value?.rotationRate.beta as number,
    gyro_y: latestIMUData.value?.rotationRate.gamma as number,
    gyro_z: latestIMUData.value?.rotationRate.alpha as number,
    gps_lat: latestGPSLat.value as number,
    gps_lon: latestGPSLng.value as number,
  }
  const dataSize = windowSize / dataInterval

  windowData.value.push(data)
  if (windowData.value.length > dataSize) {
    windowData.value.shift()
  }
}

// world-frame transform function
export function rotateToWorldFrame(acc: Acceleration, rotation: RotationRate) {
  // alpha = yaw (rotationRate.alpha)
  // beta = pitch (rotationRate.beta)
  // gamma = roll (rotationRate.gamma)

  if (rotation.alpha == null || rotation.beta == null || rotation.gamma == null) {
    console.warn('Rotation values are null, skipping transform')
    return acc // fallback: return raw acceleration
  }
  if (acc.x == null || acc.y == null || acc.z == null) {
    console.warn('Acceleration values are null, skipping transform')
    return acc // fallback: return raw acceleration
  }

  const yaw = (rotation?.alpha * Math.PI) / 180
  const pitch = (rotation.beta * Math.PI) / 180
  const roll = (rotation.gamma * Math.PI) / 180

  // Rotation order: ZYX (yaw → pitch → roll)
  const Rz = math.matrix([
    [Math.cos(yaw), -Math.sin(yaw), 0],
    [Math.sin(yaw), Math.cos(yaw), 0],
    [0, 0, 1],
  ])
  const Ry = math.matrix([
    [Math.cos(pitch), 0, Math.sin(pitch)],
    [0, 1, 0],
    [-Math.sin(pitch), 0, Math.cos(pitch)],
  ])
  const Rx = math.matrix([
    [1, 0, 0],
    [0, Math.cos(roll), -Math.sin(roll)],
    [0, Math.sin(roll), Math.cos(roll)],
  ])

  const rotationMatrix = math.multiply(Rz, Ry, Rx)
  const accVec = math.matrix([[acc.x], [acc.y], [acc.z]])

  const worldVec = math.multiply(rotationMatrix, accVec)
  return {
    x: worldVec.get([0, 0]),
    y: worldVec.get([1, 0]),
    z: worldVec.get([2, 0]),
  }
}
