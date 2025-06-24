import { describe, it, expect, beforeEach } from 'vitest'
import * as kf from '@/composables/useKalmanFilter'

describe('UTC-04: useKalmanFilter', () => {
  const TD_01 = { initLat: 18.9, initLng: 96.8, heading: 0 }
  const TD_02 = {
    mode: 0,
    acc: { x: 0, y: 1, z: 0 },
    dt: 1,
    prob: { Forward: 1, Turn: 0, Halt: 0 },
  }
  const TD_03 = { lat: 18, lng: 96 }

  beforeEach(() => {
    kf.init(TD_01.initLat, TD_01.initLng, TD_01.heading)
  })

  it('TC-01: should initialize Kalman Filter', () => {
    expect(kf.isInitialized()).toBe(true)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeCloseTo(TD_01.initLat, 6)
    expect(lng).toBeCloseTo(TD_01.initLng, 6)
  })

  it('TC-02: should predict next position with slight movement forward', () => {
    kf.predict(TD_02.mode, TD_02.acc, TD_02.dt, TD_02.prob)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeGreaterThanOrEqual(TD_01.initLat)
    expect(lat).toBeLessThan(TD_01.initLat + 1e-6)
    expect(lng).toBeCloseTo(TD_01.initLng, 6)
  })

  it('TC-03: should update position closer to measured [18, 96]', () => {
    kf.update(TD_03.lat, TD_03.lng)
    const [lat, lng] = kf.getLatLng()
    expect(lat).toBeGreaterThan(TD_03.lat)
    expect(lat).toBeLessThan(TD_01.initLat)
    expect(lng).toBeGreaterThan(TD_03.lng)
    expect(lng).toBeLessThan(TD_01.initLng)
  })
})
