/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue'
import * as math from 'mathjs'
import type { Acceleration } from '@/types/IMU'
import type { Probability } from '@/types/prediction'
import { ExtendedKalmanFilter } from '@/utils/KalmanFilter'
import { coordinatesTransform } from '@/utils/CoordinateTransformer'
import { DistancePredictor } from '@/utils/DistancePredictor'

export type Mode = 'forward' | 'turn' | 'halt'

export function KalmanFilteredPosition() {
  const kf = ref<ExtendedKalmanFilter | null>(null)
  const Q = ref<math.Matrix | null>(null)
  const maxAccel = 5.0
  let coordsTransform = coordinatesTransform()
  const distancePredictor = DistancePredictor()

  function init(
    initLat: number,
    initLng: number,
    orien: number,
    processNoise: number = 0.001
  ) {
    coordsTransform = coordinatesTransform(initLat, initLng)
    // console.log("kf initing", [initLat, initLng])
    const ENUcoords = coordsTransform.latLngToENU(initLat, initLng)
    // console.log("enu init at", ENUcoords)
    const initStates = [ENUcoords[0], ENUcoords[1], 0, orien] // states (x) : [east, north, velocity, heading_yaw]
    const p = math.diag([1, 1, 2, 0.1])
    const h = math.matrix([
      [1,0,0,0],
      [0,1,0,0],
      [0,0,0,1]
    ])
    const r = math.diag([5, 5, 0.05])

    kf.value = new ExtendedKalmanFilter(initStates, p, h, r)
    Q.value = math.multiply(math.diag([1, 1, 0.1, 1]), processNoise)

  }

  function isInitialized(): boolean {
    return kf.value !== null && kf.value !== undefined
  }

  function predict(
    mode: number,
    acc: Acceleration,
    dt: number,
    prob: Probability,
    gyroYawRateRad: number,
  ): [number, number] {
    const x_n0 = kf.value?.x as math.Matrix
    const east_n0 = x_n0.get([0, 0])
    const nort_n0 = x_n0.get([1, 0])
    const velo_n0 = x_n0.get([2, 0])
    const head_n0 = x_n0.get([3, 0])

    const acc_x = acc.x as number
    const acc_y = acc.y as number

    const forward_x = Math.sin(head_n0)
    const forward_y = Math.cos(head_n0)

    const accel = acc_x * forward_x + acc_y * forward_y
    const capped_accel = Math.min(accel, maxAccel)

    let result: any
    switch (mode) {
      case 1:
        let kick_boost_acc = velo_n0
        if (velo_n0 < 0.5) {
          kick_boost_acc = 0.7
        }
        result = distancePredictor.forward(
          east_n0,
          nort_n0,
          kick_boost_acc,
          head_n0,
          capped_accel,
          dt,
        )
        break
      case 2:
        result = distancePredictor.turn(east_n0, nort_n0, velo_n0, head_n0, capped_accel, dt)
        break
      case 0:
        result = distancePredictor.halt(east_n0, nort_n0)
        break
    }
    let head_n1 = (head_n0 + gyroYawRateRad * dt) % (2 * Math.PI)
    if (head_n1 < 0) head_n1 += 2 * Math.PI
    console.log('result: ', result)
    const x = math.matrix([[result.e], [result.n], [result.v], [head_n1]])
    const F = blendF(velo_n0, head_n0, dt, prob)
    const Q_blend = blendQ(prob)
    kf.value?.predict( F, Q_blend, x)
    // console.log("POS KF predicted latLng now", getLatLng())
    return getLatLng()
  }

  function update(lat: number, lng: number, heading: number): [number, number] {
    // console.log("pos KF update with", [lat, lng])
    const [e, n] = coordsTransform.latLngToENU(lat, lng)
    const z = math.matrix([[e], [n], [heading]])
    kf.value?.update(z)
    return getLatLng()
  }

  function getLatLng(): [number, number] {
    // console.log("state enu", kf.value?.getState())
    const result = kf.value?.getState() as [number, number]
    const latLng = coordsTransform.ENUToLatLng(result[0], result[1])
    // console.log("lreturned latlng", latLng)
    return latLng
  }

  function getRadHeading(): number {
    const result = kf.value?.x as math.Matrix
    return result.get([3, 0])
  }

  return {
    init,
    isInitialized,
    predict,
    update,
    getLatLng,
    getRadHeading,
  }
}

function blendF(v: number, yaw: number, dt: number, prob: Probability) {
  const FForward = jacobianFForward(v, yaw, dt)
  const FTurn = jacobianFTurn(v, yaw, dt)
  const FHalt = jacobianFHalt()
  return math.add(
    math.multiply(FForward, prob.Forward),
    math.multiply(FTurn, prob.Turn),
    math.multiply(FHalt, prob.Halt),
  )
}

function blendQ(prob: Probability): math.Matrix {
  const QForward = math.diag([0.2, 0.2, 0.1, 0.05])
  const QTurn = math.diag([0.5, 0.5, 0.5, 0.05])
  const QHalt = math.diag([0.005, 0.005, 0.005, 0.05])

  return math.add(
    math.multiply(QForward, prob.Forward),
    math.multiply(QTurn, prob.Turn),
    math.multiply(QHalt, prob.Halt),
  )
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

// function radToDeg(rad: number): number {
//   return (rad * 180) / Math.PI
// }
