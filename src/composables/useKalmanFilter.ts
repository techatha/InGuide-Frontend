/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import * as math from 'mathjs'
import type { Acceleration } from '@/types/IMU'
import type { Probability } from '@/types/prediction'
import { ExtendedKalmanFilter } from '@/utils/KalmanFilter'

const EARTH_RADIUS = 6378137 //appeox meter
const lat0 = ref<number | null>(null)
const lng0 = ref<number | null>(null)
export type Mode = 'forward' | 'turn' | 'halt'

export const state = ref<number | null>(null)
const kf = ref<ExtendedKalmanFilter | null>(null)
const Q = ref<math.Matrix | null>(null)

export function init(initLat: number, initLng: number, orien: number, processNoise: number = 0.025) {
  lat0.value = initLat
  lng0.value = initLng
  kf.value = new ExtendedKalmanFilter(latLngToENU(initLat, initLng), orien)
  Q.value = math.multiply(math.identity(4), processNoise) as math.Matrix // need to blend if not work
}

export function isInitialized(): boolean {
  return kf.value !== null
}

export function predict(mode: number, acc: Acceleration, dt: number, prob: Probability) {
  const x_n0 = kf.value?.x as math.Matrix
  const east_n0 = x_n0.get([0, 0])
  const nort_n0 = x_n0.get([1, 0])
  const velo_n0 = x_n0.get([2, 0])
  const head_n0 = x_n0.get([3, 0])

  const acc_x = acc.x as number
  const acc_y = acc.y as number
  const acc_z = acc.z as number
  const a = Math.sqrt(acc_x * acc_x + acc_y * acc_y + acc_z * acc_z)
  let result: any
  switch (mode) {
    case 1:
      let kick_boost_acc = velo_n0
      if (mode === 1 && velo_n0 < 0.1) {
        kick_boost_acc = 0.5
      }
      result = predictForward(east_n0, nort_n0, kick_boost_acc, head_n0, a, dt)
      break
    case 2:
      result = predictTurn(east_n0, nort_n0, velo_n0, head_n0, a, dt)
      break
    case 0:
      result = predictHalt(east_n0, nort_n0)
      break
  }
  let head_n1 = (head_n0 + acc_z * dt) % (2 * Math.PI)
  if (head_n1 < 0) head_n1 += 2 * Math.PI
  const x = math.matrix([[result.e], [result.n], [result.v], [head_n1]])
  const F = blendF(velo_n0, head_n0, dt, prob)
  kf.value?.predict(x, F, Q.value as math.Matrix)
}

export function update(lat: number, lng: number){
  const [e, n] = latLngToENU(lat, lng)
  const z = math.matrix([[e], [n]])
  kf.value?.update(z)
}

export function getLatLng(): [number, number] {
  const result = kf.value?.getState() as [number, number]
  const latLng = ENUToLatLng(result[0], result[1])
  return latLng
}

function latLngToENU(lat: number, lng: number): [number, number] {
  const dLat = (lat - (lat0.value as number)) * Math.PI
  const dLng = (lng - (lng0.value as number)) * Math.PI
  const nort = dLat * EARTH_RADIUS
  const east = dLng * EARTH_RADIUS * Math.cos(((lat0.value as number) * Math.PI) / 180)
  return [east, nort]
}

function ENUToLatLng(east: number, north: number): [number, number] {
  const dLat = north / EARTH_RADIUS
  const dLng = east / (EARTH_RADIUS * Math.cos(((lat0.value as number) * Math.PI) / 180))
  const lat = (lat0.value as number) + (dLat * 180) / Math.PI
  const lng = (lng0.value as number) + (dLng * 180) / Math.PI
  return [lat, lng]
}

function blendF(v: number, yaw: number, dt: number, prob: Probability) {
  const FForward = jacobianFForward(v, yaw, dt)
  const FTurn = jacobianFTurn(v, yaw, dt)
  const FHalt = jacobianFHalt()
  return math.add(
    math.multiply(FForward, prob.Forward),
    math.multiply(FTurn, prob.Turn),
    math.multiply(FHalt, prob.Halt)
  )
}

function predictForward(e: number, n: number, v: number, yaw: number, acc: number, dt: number) {
  const east_n1 = e + v * Math.sin(yaw) * dt
  const nort_n1 = n + v * Math.cos(yaw) * dt
  const velo_n1 = v + acc * dt
  return { e: east_n1, n: nort_n1, v: velo_n1 }
}

function predictTurn(e: number, n: number, v: number, yaw: number, acc: number, dt: number) {
  const east_n1 = e + v * Math.sin(yaw) * dt
  const nort_n1 = n + v * Math.cos(yaw) * dt
  const velo_n1 = 0 + acc * dt
  return { e: east_n1, n: nort_n1, v: velo_n1 }
}

function predictHalt(e: number, n: number) {
  const east_n1 = e
  const nort_n1 = n
  const velo_n1 = 0
  return { e: east_n1, n: nort_n1, v: velo_n1 }
}

function jacobianFForward(v: number, yaw: number, dt: number): math.Matrix {
  const s = Math.sin(yaw),
    c = Math.cos(yaw)
  const F = math.zeros(4, 4) as math.Matrix
  // ∂e'/∂e =1, ∂e'/∂v = sin(yaw)*dt, ∂e'/∂yaw = v*cos(yaw)*dt
  // ∂n'/∂n =1, ∂n'/∂v = cos(yaw)*dt, ∂n'/∂yaw = -v*sin(yaw)*dt
  F.set([0, 0], 1)
  F.set([0, 2], s * dt)
  F.set([0, 3], v * c * dt)
  F.set([1, 1], 1)
  F.set([1, 2], c * dt)
  F.set([1, 3], -v * s * dt)
  // ∂v'/∂v =1; ∂yaw'/∂yaw =1
  F.set([2, 2], 1)
  F.set([3, 3], 1)
  return F
}

function jacobianFTurn(v: number, yaw: number, dt: number): math.Matrix {
  const s = Math.sin(yaw),
    c = Math.cos(yaw)
  const F = math.zeros(4, 4) as math.Matrix
  // If e'/n' still depend on v:
  F.set([0, 0], 1)
  F.set([0, 2], s * dt)
  F.set([0, 3], v * c * dt)
  F.set([1, 1], 1)
  F.set([1, 2], c * dt)
  F.set([1, 3], -v * s * dt)
  // If v2 = a_forward*dt (independent of previous v): ∂v'/∂v = 0
  F.set([2, 2], 0)
  // yaw
  F.set([3, 3], 1)
  return F
}

function jacobianFHalt(): math.Matrix {
  const F = math.zeros(4, 4) as math.Matrix
  // e'/n' = e/n → ∂e'/∂e=1, ∂n'/∂n=1; no dependence on v or yaw
  F.set([0, 0], 1)
  F.set([1, 1], 1)
  // v'/v = 0
  F.set([2, 2], 0)
  // yaw'/yaw =1
  F.set([3, 3], 1)
  return F
}
