import * as tf from '@tensorflow/tfjs'

function computeFrequencyDomain(signal: number[], interval: number) {
  const N = signal.length
  const fs = 1000 / interval
  const fftValues = tf.spectral.fft(tf.complex(signal, new Array(N).fill(0))).abs().arraySync() as number[]
  const frequencies = Array.from({length: N}, (_, i) => i * fs / N)

  const pos = frequencies.slice(1, N/2)
  const mags = fftValues.slice(1, N/2)
  const power = mags.map(m => m*m)

  const powerSum = power.reduce((a,b) => a+b, 0)
  if (powerSum === 0) return [0, 0]

  const meanFreq = pos.map((f,i) => f*power[i]).reduce((a,b) => a+b, 0) / powerSum
  const dominantFreq = pos[mags.indexOf(Math.max(...mags))]

  return [meanFreq, dominantFreq]
}

function eulerToRotationMatrix(yaw: number, pitch: number, roll: number): number[][] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cr = Math.cos(roll), sr = Math.sin(roll)

  return [
    [cy*cp, cy*sp*sr - sy*cr, cy*sp*cr + sy*sr],
    [sy*cp, sy*sp*sr + cy*cr, sy*sp*cr - cy*sr],
    [-sp,   cp*sr,             cp*cr]
  ]
}

function applyRotation(mat: number[][], vec: number[]): number[] {
  return [
    mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
    mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
    mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2],
  ]
}


// -------- Stats Helpers --------
function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}
function median(arr: number[]): number {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}
function std(arr: number[]): number {
  if (arr.length === 0) return 0
  const m = mean(arr)
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)))
}
function min(arr: number[]): number {
  return arr.length ? Math.min(...arr) : 0
}
function max(arr: number[]): number {
  return arr.length ? Math.max(...arr) : 0
}
function meanAbs(arr: number[]): number {
  return arr.length ? mean(arr.map(Math.abs)) : 0
}

// -------- Main Preprocess --------
export function preprocess(
  data: Array<{
    acc_x: number; acc_y: number; acc_z: number
    acc_gx: number; acc_gy: number; acc_gz: number
    gyro_x: number; gyro_y: number; gyro_z: number
    gps_lat: number; gps_lon: number
  }>,
  dataInterval = 500
): number[] {
  // 1. Rotate accelerometer + gravity
  const accWorld: number[][] = []
  const accGravWorld: number[][] = []
  const magnitudes: number[] = []

  for (const row of data) {
    const yaw = row.gyro_x
    const pitch = row.gyro_y
    const roll = row.gyro_z
    const Rmat = eulerToRotationMatrix(yaw, pitch, roll)

    const accVec = [row.acc_x, row.acc_y, row.acc_z]
    const gravVec = [row.acc_gx, row.acc_gy, row.acc_gz]
    const accW = applyRotation(Rmat, accVec)
    const gravW = applyRotation(Rmat, gravVec)

    accWorld.push(accW)
    accGravWorld.push(gravW)
    magnitudes.push(Math.sqrt(accW[0] ** 2 + accW[1] ** 2 + accW[2] ** 2))
  }

  const accX = accWorld.map(v => v[0])
  const accY = accWorld.map(v => v[1])
  const accZ = accWorld.map(v => v[2])
  const accGX = accGravWorld.map(v => v[0])
  const accGY = accGravWorld.map(v => v[1])
  const accGZ = accGravWorld.map(v => v[2])
  const gyroZ = data.map(r => r.gyro_z)

  // 2. Compute features
  const mean_acc_x = mean(accX)
  const median_acc_x = median(accX)
  const std_acc_x = std(accX)
  const min_acc_x = min(accX)
  const max_acc_x = max(accX)
  const mean_abs_x = meanAbs(accX)

  const mean_acc_y = mean(accY)
  const median_acc_y = median(accY)
  const std_acc_y = std(accY)
  const min_acc_y = min(accY)
  const max_acc_y = max(accY)
  const mean_abs_y = meanAbs(accY)

  const mean_acc_z = mean(accZ)
  const median_acc_z = median(accZ)
  const std_acc_z = std(accZ)
  const min_acc_z = min(accZ)
  const max_acc_z = max(accZ)
  const mean_abs_z = meanAbs(accZ)

  const mean_acc_gx = mean(accGX)
  const mean_acc_gy = mean(accGY)
  const mean_acc_gz = mean(accGZ)

  const gyro_z_mean = mean(gyroZ)
  const gyro_z_std = std(gyroZ)
  const gyro_z_max = max(gyroZ)
  const gyro_z_min = min(gyroZ)

  const mean_magnitude = mean(magnitudes)
  const signal_magnitude_area = Math.abs(mean_acc_x) + Math.abs(mean_acc_y) + Math.abs(mean_acc_z)

  const [mean_freq_x, dominant_freq_x] = computeFrequencyDomain(accX, dataInterval)
  const [mean_freq_y, dominant_freq_y] = computeFrequencyDomain(accY, dataInterval)
  const [mean_freq_z, dominant_freq_z] = computeFrequencyDomain(accZ, dataInterval)

  const diff_lat = data[0].gps_lat - data[data.length - 1].gps_lat
  const diff_lon = data[0].gps_lon - data[data.length - 1].gps_lon

  // 3. Return feature vector in same order as training
  return [
    mean_acc_x, median_acc_x, std_acc_x, min_acc_x, max_acc_x, mean_abs_x,
    mean_acc_y, median_acc_y, std_acc_y, min_acc_y, max_acc_y, mean_abs_y,
    mean_acc_z, median_acc_z, std_acc_z, min_acc_z, max_acc_z, mean_abs_z,
    mean_acc_gx, mean_acc_gy, mean_acc_gz,
    gyro_z_mean, gyro_z_std, gyro_z_max, gyro_z_min,
    mean_magnitude, signal_magnitude_area,
    mean_freq_x, dominant_freq_x,
    mean_freq_y, dominant_freq_y,
    mean_freq_z, dominant_freq_z,
    diff_lat, diff_lon,
  ]
}
