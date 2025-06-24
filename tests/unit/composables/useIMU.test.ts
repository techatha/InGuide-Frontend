/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { nextTick } from 'vue'
import {
  permission,
  requestPermission,
  currentIMUReading,
  getIMUData,
  interval,
} from '@/composables/useIMU'

// TD-01
const TD_01 = 'granted'
// TD-02
const TD_02 = {
  accelerometer: { x: 1.2, y: 0.3, z: 0 },
  accIncludeGravity: { x: 1.2, y: 0.3, z: 9.8 },
  rotationRate: { alpha: 0.1, beta: 0.2, gamma: 0.3 },
}

// Mocking DeviceMotionEvent object
let mockRequestPermission: Mock | undefined
let mockAddEventListener: Mock | undefined
let capturedDevicemotionCallback: ((event: DeviceMotionEvent) => void) | undefined

const createMockDeviceMotionEvent = (data: typeof TD_02): DeviceMotionEvent => {
  const mockEvent: Partial<DeviceMotionEvent> = {
    acceleration: data.accelerometer,
    rotationRate: data.rotationRate,
    accelerationIncludingGravity: data.accIncludeGravity,
    interval: 0,
    type: 'devicemotion',
    timeStamp: Date.now(),
    // Basic Event properties to satisfy the interface (can be omitted if not strictly checked)
    bubbles: false,
    cancelable: false,
    composed: false,
    currentTarget: null,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    srcElement: null,
    target: null,
  }
  return mockEvent as DeviceMotionEvent
}

// Test suite for useGeolocation
describe('UTC-02: Test-useIMU', () => {
  beforeEach(() => {
    // Reset state
    permission.value = null
    interval.value = null
    currentIMUReading.value = null

    vi.clearAllMocks()
    vi.restoreAllMocks()

    // Create mock for DeviceMotionEvent.requestPermission
    const mockDeviceMotionEventObject = {
      requestPermission: vi.fn(() => Promise.resolve(TD_01)),
    } as unknown as typeof DeviceMotionEvent

    Object.defineProperty(window, 'DeviceMotionEvent', {
      writable: true,
      configurable: true,
      value: mockDeviceMotionEventObject,
    })

    mockRequestPermission = (window.DeviceMotionEvent as any).requestPermission


    // Intercept addEventListener to capture devicemotion callback
    capturedDevicemotionCallback = undefined
    mockAddEventListener = vi.fn((event, callback) => {
      if (event === 'devicemotion' && typeof callback === 'function') {
        capturedDevicemotionCallback = callback as (event: DeviceMotionEvent) => void
      }
    })

    vi.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener)
    vi.spyOn(window, 'removeEventListener').mockImplementation(vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('TC-01: Test if request IMU can be granted', async () => {
    await requestPermission()
    expect(permission.value).toBe(TD_01)
    expect(mockRequestPermission).toHaveBeenCalledTimes(1)
  })

  it('TC-02: GPS coordinate are updates correctly', async () => {
    await requestPermission()
    if (capturedDevicemotionCallback) {
      const mockEvent = createMockDeviceMotionEvent(TD_02)
      capturedDevicemotionCallback(mockEvent) // Simulate the event firing
    } else {
      throw new Error('devicemotion event listener was not captured. Check composable logic.')
    }
    const resultFromGetter = getIMUData()
    await nextTick()
    expect(currentIMUReading.value).toEqual(TD_02)
    expect(resultFromGetter).toEqual(TD_02)
  })
})
