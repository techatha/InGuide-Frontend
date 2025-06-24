/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as positioning from '@/composables/usePositioningSystem'
import * as geolocation from '@/composables/useGeolocation'
import * as imu from '@/composables/useIMU'
import * as orientation from '@/composables/useDeviceOrientation'

// Mock permission requests from DeviceMotionEvent and DeviceOrientationEvent
global.DeviceMotionEvent = {
  requestPermission: vi.fn(() => Promise.resolve('granted')),
} as any

global.DeviceOrientationEvent = {
  requestPermission: vi.fn(() => Promise.resolve('granted')),
} as any

// Mocks for navigator.geolocation
const mockWatchId = 12345
vi.stubGlobal('navigator', {
  geolocation: {
    watchPosition: vi.fn((_success, _error, _opts) => mockWatchId),
    clearWatch: vi.fn(),
  },
})

// ✅ Patch `.value` of permission refs correctly
vi.spyOn(imu, 'requestPermission').mockImplementation(async () => {
  imu.permission.value = 'granted'
})

vi.spyOn(orientation, 'requestPermission').mockImplementation(async () => {
  orientation.permission.value = 'granted'
})

vi.spyOn(geolocation, 'init').mockImplementation(() => {
  geolocation.watcherId.value = mockWatchId
})

describe('ITC-05: usePositioningSystem', () => {
  beforeEach(() => {
    imu.permission.value = 'default'
    orientation.permission.value = 'default'
    geolocation.watcherId.value = null
  })

  it('TC-01: should initialize all submodules correctly', async () => {
    await positioning.init()

    expect(geolocation.init).toHaveBeenCalled()
    expect(geolocation.watcherId.value).not.toBeNull()

    expect(imu.requestPermission).toHaveBeenCalled()
    expect(imu.permission.value).toBe('granted')

    expect(orientation.requestPermission).toHaveBeenCalled()
    expect(orientation.permission.value).toBe('granted')
  })
})
