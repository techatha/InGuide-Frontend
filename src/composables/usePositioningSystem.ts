/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, watch } from 'vue'
import * as gps from '@/composables/useGeolocation'
import * as imu from '@/composables/useIMU'
import * as orien from '@/composables/useDeviceOrientation'
import * as kf from '@/composables/useKalmanFilter'
import type { Acceleration, IMUData } from '@/types/IMU'
import type { Data, PredictionPayload, PredictionResponse, Probability } from '@/types/prediction'
import { submitPayload } from '@/services/predictionService'

const latestGPSLat = ref<number | null>(null);
const latestGPSLng = ref<number | null>(null);
const latestIMUData = ref<IMUData | null>(null);

const latestPrediction = ref<PredictionResponse | null>(null);
const isSubmittingPrediction = ref(false);
let latestPredictionUpdate: number;

const windowData = ref<Data[]>([]);
let windowSize: number;
let dataInterval: number;

export function init(interval: number = 500, window: number = 2000, predictInterval: number = 1000) {
  gps.init()
  imu.requestPermission()
  windowSize = window;
  dataInterval = interval;

  watch([gps.lat, gps.lng, imu.currentIMUReading], ([lat, lng, imu]) => {
    if (lat != null && lng != null && (latestGPSLat.value != lat || latestGPSLng.value != lng)) {
      // console.log('gps read!');
      // console.log('new lat/lng: ', [lat, lng]);
      latestGPSLat.value = lat
      latestGPSLng.value = lng
      if (!kf.isInitialized()) {
        kf.init(lat, lng, orien.getCurrentHeading());
      }
      kf.update(lat, lng)
      latestPredictionUpdate = Date.now()
    }
    if (imu != null && latestIMUData.value != imu) {
      latestIMUData.value = imu
    }
  })

  watch(latestPrediction, (pred) => {
    const dt = Date.now() - latestPredictionUpdate
    const acc: Acceleration = latestIMUData.value?.accelerometer as Acceleration
    kf.predict(pred?.prediction as number, acc, dt, pred?.probability as Probability)
  })

  setInterval(() => {
    pushDataIntoWindowFame()
  }, interval);

  setTimeout(() => {
    setInterval(async() => {
      await getPrediction();
    }, predictInterval)
  }, 500);
}

async function getPrediction() {
  if (isSubmittingPrediction.value) {
    // console.log('Prediction submission already in progress, skipping.');
    return;
  }
  const payload: PredictionPayload = {
    interval: dataInterval,
    data: [...windowData.value],
  }
  isSubmittingPrediction.value = true;
  try {
    const response = await submitPayload(payload);
    latestPrediction.value = response;

  } catch (err: any) {
    console.log("Prediction error :", err)
  } finally {
    isSubmittingPrediction.value = false;
  }
}

export function getPredictionResult() {
  return latestPrediction.value;
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
    // gyro data is WRONG T-T -> x = beta, y = gamma, z = alpha
    gyro_x: latestIMUData.value?.rotationRate.alpha as number,
    gyro_y: latestIMUData.value?.rotationRate.beta as number,
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
