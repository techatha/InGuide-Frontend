import { describe, it, expect, beforeEach } from 'vitest'
import * as kf from '@/composables/useKalmanFilter'
// import { predictForward, predictHalt, predictTurn } from '@/composables/useKalmanFilter'

describe('Unit tests on useKalmanFilter.ts', () => {
  const TD_01 = { initLat: 18.9, initLng: 96.8, orien: 0 }
  const TD_02 = {
    mode: 0,
    acc: { x: 0, y: 1, z: 0 },
    dt: 1,
    prob: { Forward: 1, Turn: 0, Halt: 0 },
    yaw: 0,
  }
  const TD_03 = { lat: 18, lng: 96, head: 0 }

  beforeEach(() => {
    kf.init(TD_01.initLat, TD_01.initLng, TD_01.orien)
  })

  it('UTC-04.01: Test-useKalmanFilter.init() TC-01', () => {
    expect(kf.isInitialized()).toBe(true)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeCloseTo(TD_01.initLat, 6)
    expect(lng).toBeCloseTo(TD_01.initLng, 6)
  })

  it('UTC-04.02: Test-useKalmanFilter.predict() TC-01', () => {
    kf.predict(TD_02.mode, TD_02.acc, TD_02.dt, TD_02.prob, TD_02.yaw)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeGreaterThanOrEqual(TD_01.initLat)
    expect(lat).toBeLessThan(TD_01.initLat + 1e-6)
    expect(lng).toBeCloseTo(TD_01.initLng, 6)
  })

  it('UTC-04.03: Test-useKalmanFilter.update() TC-01', () => {
    kf.update(TD_03.lat, TD_03.lng, TD_03.head)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeGreaterThan(TD_03.lat)
    expect(lat).toBeLessThan(TD_01.initLat)
    expect(lng).toBeGreaterThan(TD_03.lng)
    expect(lng).toBeLessThan(TD_01.initLng)
  })

  it('UTC-04.04: User facing NORTH (0°), should move northward', () => {
    // Set initial known heading (0 deg => facing north)
    kf.update(TD_01.initLat, TD_01.initLng, 0)

    // Predict with movement forward
    kf.predict(1, { x: 0, y: 1, z: 0 }, 1, { Forward: 1, Turn: 0, Halt: 0 }, 0)

    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeGreaterThan(TD_01.initLat) // moved north
    expect(lng).toBeCloseTo(TD_01.initLng, 6) // no east movement
  })

  it('UTC-04.05: User facing EAST (90°), should move eastward', () => {
    // Heading = 90 degrees → π/2 radians
    const eastHeadingRad = Math.PI / 2
    kf.update(TD_01.initLat, TD_01.initLng, eastHeadingRad)

    // Predict with movement forward
    kf.predict(1, { x: 0, y: 1, z: 0 }, 1, { Forward: 1, Turn: 0, Halt: 0 }, 0)

    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeCloseTo(TD_01.initLat, 6) // no north movement
    expect(lng).toBeGreaterThan(TD_01.initLng) // moved east
  })
})
