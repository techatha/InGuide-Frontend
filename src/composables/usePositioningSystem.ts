import { ref, watch } from 'vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useIMU } from '@/composables/useIMU'
import { useDeviceOrientation } from '@/composables/useDeviceOrientation'
import { KalmanFilteredPosition } from '@/utils/KalmanFilteredPosition'
import { KalmanFilteredLatLng } from '@/utils/KalmanFilteredLatLng'
import { DeadReconing } from '@/utils/DeadReconing'
import { WindowFrameBuffer } from '@/utils/WindowFrameBuffer'
import { rotateToWorldFrame } from '@/utils/RotateToWorldFrame'
import { submitPayload } from '@/services/PredictionService'

import type { IMUData, Acceleration, RotationRate } from '@/types/IMU'
import type { PredictionPayload, PredictionResponse } from '@/types/prediction'

/** ======== Sensors ======== */
const gps = useGeolocation()
const imu = useIMU()
const orien = useDeviceOrientation()

/** ======== Filters ======== */
const kf2 = KalmanFilteredPosition() // display & final positioning
const kf1 = KalmanFilteredLatLng()   // fusion of inertial + prob

/** ======== Dead Reckoning ======== */
const deadRecon = ref<DeadReconing | null>(null)

/** ======== Data Buffers ======== */
const imuBuffer: IMUData[] = []
const windowBuffer = WindowFrameBuffer()

/** ======== State ======== */
const latestGPSLat = ref<number | null>(null)
const latestGPSLng = ref<number | null>(null)
const latestIMUData = ref<IMUData | null>(null)
const latestPrediction = ref<PredictionResponse | null>(null)
const isSubmittingPrediction = ref(false)

/** ======== Initialization ======== */
export async function init(
  interval: number = 500,
  windowSize: number = 4000,
  predictInterval: number = 1000,
): Promise<boolean> {
  gps.init()
  imu.requestPermission()
  orien.requestPermission()

  windowBuffer.setSize(windowSize, interval)

  /** ======== Watchers ======== */
  watch([gps.lat, gps.lng], ([lat, lng]) => {
    if (lat != null && lng != null && (latestGPSLat.value !== lat || latestGPSLng.value !== lng)) {
      latestGPSLat.value = lat
      latestGPSLng.value = lng

      const heading = orien.heading.value ?? 0

      if (!kf2.isInitialized()) {
        kf2.init(lat, lng, (heading * Math.PI) / 180)
      }

      if (!kf1.deadRecon.value) {
        kf1.init(lat, lng, (heading * Math.PI) / 180)
        deadRecon.value = kf1.deadRecon.value
      }
    }
  })

  watch(orien.heading, (heading) => {
    if (heading != null && latestGPSLat.value != null && latestGPSLng.value != null) {
      kf2.update(latestGPSLat.value, latestGPSLng.value, (heading * Math.PI) / 180)
    }
  })

  watch(imu.IMUReading, (imuData) => {
    if (imuData) {
      latestIMUData.value = imuData
      imuBuffer.push(imuData)
    }
  })

  /** ======== Prediction Loop ======== */
  setInterval(() => {
    if (!latestIMUData.value || imuBuffer.length === 0) return

    // Average accelerometer & gyro over buffer
    const acc = imuBuffer.reduce(
      (acc, curr) => ({
        x: acc.x ?? 0 + (curr.accelerometer.x ?? 0),
        y: acc.y ?? 0 + (curr.accelerometer.y ?? 0),
        z: acc.z ?? 0 + (curr.accelerometer.z ?? 0),
      }),
      { x: 0, y: 0, z: 0 } as Acceleration,
    )
    if(acc.x)
      acc.x /= imuBuffer.length
    if(acc.y)
      acc.y /= imuBuffer.length
    if(acc.z)
      acc.z /= imuBuffer.length

    const gyro = imuBuffer.reduce(
      (gyro, curr) => ({
        alpha: gyro.alpha ?? 0 + (curr.rotationRate.alpha ?? 0),
        beta: gyro.beta ?? 0 + (curr.rotationRate.beta ?? 0),
        gamma: gyro.gamma ?? 0 + (curr.rotationRate.gamma ?? 0),
      }),
      { alpha: 0, beta: 0, gamma: 0 } as RotationRate,
    )
    if(gyro.alpha)
      gyro.alpha /= imuBuffer.length
    if(gyro.beta)
      gyro.beta /= imuBuffer.length
    if(gyro.gamma)
      gyro.gamma /= imuBuffer.length

    imuBuffer.length = 0 // clear after processing

    // Rotate into world frame
    const worldAcc = rotateToWorldFrame(acc, gyro)
    const headingRad = (orien.heading.value ?? 0) * Math.PI / 180

    // KF1 prediction (world-frame inertial)
    const inertialPred = kf1.predict(
      { ...latestIMUData.value, accelerometer: worldAcc, rotationRate: gyro },
      headingRad,
      0.5, // dt
      latestPrediction.value?.probability,
    )

    // KF2 update with KF1 fused result
    kf2.update(inertialPred[0], inertialPred[1], headingRad)
  }, 500)

  /** ======== Window Buffer ======== */
  setInterval(() => {
    pushToWindowBuffer()
  }, interval)

  /** ======== Remote Prediction ======== */
  setTimeout(() => {
    setInterval(async () => {
      await requestPrediction()
    }, predictInterval)
  }, 500)

  return true
}

/** ======== Window Push ======== */
function pushToWindowBuffer() {
  if (latestIMUData.value && latestGPSLat.value !== null && latestGPSLng.value !== null) {
    windowBuffer.push(latestIMUData.value, latestGPSLat.value, latestGPSLng.value)
  }
}

/** ======== Request Prediction ======== */
async function requestPrediction() {
  if (isSubmittingPrediction.value) return
  isSubmittingPrediction.value = true

  try {
    const payload: PredictionPayload = {
      interval: windowBuffer.getInterval(),
      data: windowBuffer.getWindowData(),
    }
    latestPrediction.value = await submitPayload(payload)
  } catch (err) {
    console.error('Prediction error:', err)
  } finally {
    isSubmittingPrediction.value = false
  }
}

/** ======== Getters ======== */
export function getPredictionResult() {
  return latestPrediction.value
}
export function getPosition(): [number, number] {
  return kf2.getLatLng()
}
export function getRadHeading(): number {
  return kf2.getRadHeading()
}
export function isAvailable(): boolean {
  return imu.permission.value != null && gps.watcherId.value != null
}

/** ======== QR Reset Hook (for future) ======== */
export function resetWithQRCode(lat: number, lng: number, facingRad: number) {
  kf1.init(lat, lng, facingRad)
  kf2.init(lat, lng, facingRad)
  deadRecon.value?.resetToBeacon({ id: 'qr-reset', latLng: [lat, lng] })
}
