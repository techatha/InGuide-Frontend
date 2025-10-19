import { ref } from 'vue'
import * as math from 'mathjs'
import { ExtendedKalmanFilter } from '@/utils/KalmanFilter'
import { coordinatesTransform } from '@/utils/CoordinateTransformer'
import type { Acceleration } from '@/types/IMU'
import { DeadReckoning } from '@/utils/DeadReckoning'

export function KalmanFilteredLatLng() {
  const kf = ref<ExtendedKalmanFilter | null>(null)
  let coordsTransform = coordinatesTransform()
  const deadReckon = ref<DeadReckoning | null>(null)

  // Optional max acceleration for dead reckoning
  const maxAccel = 3.0

  /** Initialize KF1 with initial lat/lng and heading */
  function init(
    initLat: number,
    initLng: number,
    headingRad: number,
    processNoise: number = 0.001,
  ) {
    coordsTransform = coordinatesTransform(initLat, initLng)
    deadReckon.value = new DeadReckoning(initLat, initLng, maxAccel)

    const ENU = coordsTransform.latLngToENU(initLat, initLng)

    // State: [east, north, velocity, heading]
    const initStates = [ENU[0], ENU[1], 0, headingRad]

    const P = math.diag([1, 1, 2, 0.1]) // initial covariance

    // Measurement matrix H (only position!)
    const H = math.multiply(math.matrix([
      [1, 0, 0, 0], // measure east
      [0, 1, 0, 0], // measure north
    ]), processNoise)

    const R = math.diag([5, 5]) // measurement noise for lat/lng only

    kf.value = new ExtendedKalmanFilter(initStates, P, H, R)
  }

  /** Predict next position using DeadReconing (inertial) + optional probabilistic model */
  function predict(
    imu: Acceleration,
    headingRad: number,
    dt: number,
    mode: number = 0,
  ): [number, number] {
    if (!kf.value || !deadReckon.value) throw new Error('KF1 not initialized')

    const inertial = deadReckon.value.step(imu, headingRad, dt, mode)

    // Construct predicted state vector
    const ENU = coordsTransform.latLngToENU(...inertial.latLng)
    const predictedState = math.matrix([
      [ENU[0]],
      [ENU[1]],
      [inertial.velocity], // keep velocity
      [headingRad],        // heading only from orientation
    ])

    // Simple F matrix (identity)
    const F = math.identity(4) as math.Matrix
    const Q = math.multiply(math.diag([1, 1, 0.1, 0.05]), 0.001)

    kf.value.predict(F, Q, predictedState)

    return getLatLng()
  }

  /** Update KF1 with a "measurement" from GPS or KF2 output (lat/lng only) */
  function update(lat: number, lng: number, confidenceNoise?: number) {
    if (!kf.value) throw new Error('KF1 not initialized')

    const ENU = coordsTransform.latLngToENU(lat, lng)
    const z = math.matrix([[ENU[0]], [ENU[1]]]) // measurement vector

    let R_override: math.Matrix | undefined = undefined;

    // If a specific confidence is provided, create a temporary R matrix for this update.
    if (confidenceNoise !== undefined) {
      R_override = math.diag([confidenceNoise, confidenceNoise]);
    }

    // Call the underlying filter's update method.
    // If R_override is undefined, the filter will use its default R matrix.
    kf.value.update(z, R_override)

    return getLatLng()
  }


  /** Return fused lat/lng from KF1 */
  function getLatLng(): [number, number] {
    if (!kf.value) throw new Error('KF1 not initialized')
    const ENU = [kf.value.x.get([0, 0]), kf.value.x.get([1, 0])]
    return coordsTransform.ENUToLatLng(ENU[0], ENU[1])
  }

  /** Return heading in radians */
  function getRadHeading(): number {
    if (!kf.value) throw new Error('KF1 not initialized')
    return kf.value.x.get([3, 0])
  }

  return {
    init,
    predict,
    update,
    getLatLng,
    getRadHeading,
    deadReckon, // expose in case you want direct access
  }
}
