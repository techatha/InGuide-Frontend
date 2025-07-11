/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { nextTick } from 'vue'
import {
  permission,
  requestPermission,
  getCurrentHeading,
  currentHeading,
} from '@/composables/useDeviceOrientation'

// TD-01
const TD_01 = 'granted'
// TD-02
const TD_02 = 45

// Mocking DeviceMotionEvent object
let mockRequestPermission: Mock | undefined
let mockAddEventListener: Mock | undefined
let capturedDeviceorienCallback: ((event: DeviceOrientationEvent) => void) | undefined

const createMockDeviceOrientationEvent = (alpha: number, beta: number, gamma: number): DeviceOrientationEvent => {
  const mockEvent: Partial<DeviceOrientationEvent> = {
    alpha: alpha,
    beta: beta,
    gamma: gamma,
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
  return mockEvent as DeviceOrientationEvent
}

// Test suite for useGeolocation
describe('Unit tests on useDeviceOrientation.ts', () => {
  beforeEach(() => {
    // Reset state
    permission.value = null
    currentHeading.value = null

    vi.clearAllMocks()
    vi.restoreAllMocks()

    const mockDeviceOrientationEventObject = {
      requestPermission: vi.fn(() => Promise.resolve(TD_01)),
    } as unknown as typeof DeviceOrientationEvent

    Object.defineProperty(window, 'DeviceOrientationEvent', {
      writable: true,
      configurable: true,
      value: mockDeviceOrientationEventObject,
    })

    mockRequestPermission = (window.DeviceOrientationEvent as any).requestPermission

    // Intercept addEventListener to capture devicemotion callback
    capturedDeviceorienCallback = undefined
    mockAddEventListener = vi.fn((event, callback) => {
      if (event === 'deviceorientation' && typeof callback === 'function') {
        capturedDeviceorienCallback = callback as (event: DeviceOrientationEvent) => void
      }
    })

    vi.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener)
    vi.spyOn(window, 'removeEventListener').mockImplementation(vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('UTC-03.01: useDeviceOrientation.requestPermission() TC-01', async () => {
    const result:boolean = await requestPermission()
    expect(permission.value).toBe(TD_01)
    expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it('UTC-03.02: Test-useDeviceOrientation.getCurrentHeading() TC-01', async () => {
    await requestPermission()
    if (capturedDeviceorienCallback) {
      const mockEvent = createMockDeviceOrientationEvent(TD_02, 0, 0)
      capturedDeviceorienCallback(mockEvent) // Simulate the event firing
    } else {
      throw new Error('deviceorientation event listener was not captured. Check composable logic.')
    }
    const resultFromGetter = getCurrentHeading()
    await nextTick()
    expect(currentHeading.value).toEqual(TD_02)
    expect(resultFromGetter).toEqual(TD_02)
  })
})
