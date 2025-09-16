import { ref, watch } from 'vue'
import { useGeolocation } from '@/composables/useGeolocation'
import { useIMU } from '@/composables/useIMU'
import { useDeviceOrientation } from '@/composables/useDeviceOrientation'
import { KalmanFilteredPosition } from '@/utils/KalmanFilteredPosition'
import { KalmanFilteredLatLng } from '@/utils/KalmanFilteredLatLng'
import { WindowFrameBuffer } from '@/utils/WindowFrameBuffer'
import { rotateToWorldFrame } from '@/utils/RotateToWorldFrame'
// import { submitPayload } from '@/services/PredictionService'
import localModel from '@/services/localModel'

import type { IMUData, Acceleration, RotationRate } from '@/types/IMU'
import type { PredictionResponse, Probability } from '@/types/prediction'
import type { Beacon } from '@/types/beacon'
import { preprocess } from '@/utils/ModelPreprocess'

/** ======== Sensors ======== */
const gps = useGeolocation()
const imu = useIMU()
const orien = useDeviceOrientation()

/** ======== Filters ======== */
const kf2 = KalmanFilteredPosition() // display & final positioning
const kf1 = KalmanFilteredLatLng() // fusion of inertial + prob

/** ======== Data Buffers ======== */
const imuBuffer: IMUData[] = []
const windowBuffer = WindowFrameBuffer()

/** ======== State ======== */
const latestGPSLat = ref<number | null>(null)
const latestGPSLng = ref<number | null>(null)
const latestIMUData = ref<IMUData | null>(null)
const latestPrediction = ref<PredictionResponse | null>(null)
// const isSubmittingPrediction = ref(false)

export function usePositioningSystem() {
  /** ======== Initialization ======== */
  function init(
    latLng: [number, number],
    interval: number = 500,
    windowSize: number = 4000,
    // predictInterval: number = 1000,
  ): boolean {
    gps.init()

    localModel.loadLocalModel()

    windowBuffer.setSize(windowSize, interval)
    const heading = orien.heading.value ?? 0

    if (!kf2.isInitialized()) {
      // console.log("kh2 init with", latLng)
      kf2.init(latLng[0], latLng[1], (heading * Math.PI) / 180)
    }

    if (!kf1.deadReckon.value) {
      kf1.init(latLng[0], latLng[1], (heading * Math.PI) / 180)
    }

    /** ======== Watchers ======== */
    watch([gps.lat, gps.lng], ([lat, lng]) => {
      if (
        lat != null &&
        lng != null &&
        (latestGPSLat.value !== lat || latestGPSLng.value !== lng)
      ) {
        latestGPSLat.value = lat
        latestGPSLng.value = lng
        // console.log("gps read", [lat, lng])
        kf1.update(latestGPSLat.value, latestGPSLng.value)
      }
    })

    watch(orien.heading, (h) => {
      if (h != null) {
        const kf1LatLng = kf1.getLatLng()
        kf2.update(kf1LatLng[0], kf1LatLng[1], (h * Math.PI) / 180)
      }
    })

    watch(imu.IMUReading, (imuData) => {
      if (imuData) {
        latestIMUData.value = imuData
        imuBuffer.push(imuData)
      }
    })

    /** ======== Prediction Loop ======== */
    setInterval(async () => {
      if (!latestIMUData.value || imuBuffer.length === 0) return

      // Average accelerometer & gyro over buffer
      const acc = imuBuffer.reduce(
        (acc, curr) => ({
          x: (acc.x ?? 0) + (curr.accelerometer.x ?? 0),
          y: (acc.y ?? 0) + (curr.accelerometer.y ?? 0),
          z: (acc.z ?? 0) + (curr.accelerometer.z ?? 0),
        }),
        { x: 0, y: 0, z: 0 } as Acceleration,
      )
      if (acc.x) acc.x /= imuBuffer.length
      if (acc.y) acc.y /= imuBuffer.length
      if (acc.z) acc.z /= imuBuffer.length

      const gyro = imuBuffer.reduce(
        (gyro, curr) => ({
          alpha: (gyro.alpha ?? 0) + (curr.rotationRate.alpha ?? 0),
          beta: (gyro.beta ?? 0) + (curr.rotationRate.beta ?? 0),
          gamma: (gyro.gamma ?? 0) + (curr.rotationRate.gamma ?? 0),
        }),
        { alpha: 0, beta: 0, gamma: 0 } as RotationRate,
      )
      if (gyro.alpha) gyro.alpha /= imuBuffer.length
      if (gyro.beta) gyro.beta /= imuBuffer.length
      if (gyro.gamma) gyro.gamma /= imuBuffer.length

      imuBuffer.length = 0 // clear after processing

      const orient: RotationRate = {
        alpha: orien.alpha.value,
        beta: orien.beta.value,
        gamma: orien.gamma.value
      }

      // console.log(orient)
      // Rotate into world frame
      const worldAcc = rotateToWorldFrame(acc, orient)
      const headingRad = ((orien.heading.value ?? 0) * Math.PI) / 180
      const gyroYawRateRad = gyro.alpha ? (gyro.alpha * Math.PI) / 180 : 0

      const window = windowBuffer.getWindowData()
      const preprocessedData = preprocess(window, windowBuffer.getInterval())
      const prob: PredictionResponse = await localModel.predictLocal(preprocessedData)
      latestPrediction.value = prob

      // console.log(prob)

      // KF1 prediction (world-frame inertial)
      kf1.predict(
        worldAcc,
        headingRad,
        interval / 1000,
        prob.prediction as number,
      )
      kf2.predict(
        prob.prediction as number,
        worldAcc,
        interval / 1000,
        prob.probability as Probability,
        gyroYawRateRad,
      )
    }, 500)

    /** ======== Window Buffer ======== */
    setInterval(() => {
      pushToWindowBuffer()
    }, interval)

    /** ======== Remote Prediction ======== */
    // setTimeout(() => {
    //   setInterval(async () => {
    //     await requestPrediction()
    //   }, predictInterval)
    // }, 500)

    return true
  }

  /** ======== Getters ======== */
  function getPredictionResult() {
    return latestPrediction.value
  }
  function getPosition(): [number, number] {
    return kf2.getLatLng()
  }
  function getRadHeading(): number {
    return kf2.getRadHeading()
  }
  function isAvailable(): boolean {
    return imu.permission.value != null && gps.watcherId.value != null
  }
  function isPermissionGranted() {
    return imu.permission.value == 'granted' && orien.permission.value == 'granted'
  }
  function resetToBeacon(beacon: Beacon) {
    kf1.deadReckon.value?.resetToBeacon(beacon)
  }

  return {
    init,
    getPredictionResult,
    getPosition,
    getRadHeading,
    isAvailable,
    resetToBeacon,
    imu,
    orien,
    isPermissionGranted,
  }
}

/** ======== Window Push ======== */
function pushToWindowBuffer() {
  if (latestIMUData.value && latestGPSLat.value !== null && latestGPSLng.value !== null) {
    windowBuffer.push(latestIMUData.value, latestGPSLat.value, latestGPSLng.value)
  }
}

/** ======== Request Prediction ======== */
// async function requestPrediction() {
//   if (isSubmittingPrediction.value) return
//   isSubmittingPrediction.value = true

//   try {
//     const payload: PredictionPayload = {
//       interval: windowBuffer.getInterval(),
//       data: windowBuffer.getWindowData(),
//     }
//     latestPrediction.value = await submitPayload(payload)
//   } catch (err) {
//     console.error('Prediction error:', err)
//   } finally {
//     isSubmittingPrediction.value = false
//   }
// }
