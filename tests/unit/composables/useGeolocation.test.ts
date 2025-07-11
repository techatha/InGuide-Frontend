import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { init, stopGPS, lat, lng, watcherId } from '@/composables/useGeolocation'

// TD-01
const TD_01 = {
  coords: {
    latitude: 18.799746109280246,
    longitude: 98.9510136873636,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
  toJSON() {
    return {
      coords: this.coords,
      timestamp: this.timestamp,
    }
  },
} as GeolocationPosition;

// Mocking navigator.geolocation object
let mockWatchPositionSuccessCallback: PositionCallback | undefined
const MOCKED_WATCH_ID = 123

const mockGeolocation = {
  watchPosition: vi.fn((success) => {
    mockWatchPositionSuccessCallback = success
    return MOCKED_WATCH_ID
  }),
  clearWatch: vi.fn(),
}

// Test suite for useGeolocation
describe('Unit tests on useGeolocation.ts', () => {
  beforeEach(() => {
    lat.value = null
    lng.value = null
    watcherId.value = null

    mockWatchPositionSuccessCallback = undefined

    mockGeolocation.watchPosition.mockClear()
    mockGeolocation.clearWatch.mockClear()

    Object.defineProperty(navigator, 'geolocation', {
      writable: true,
      value: mockGeolocation,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('UTC-01.01: useGeolocation.init() TC-01', () => {
    const result:boolean = init()
    expect(watcherId.value).toBe(MOCKED_WATCH_ID)
    expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1)
    expect(mockGeolocation.clearWatch).not.toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('UTC-01.02: useGeolocation.lat TC-01', async () => {
    init();
    expect(watcherId.value).toBe(MOCKED_WATCH_ID);
    expect(mockWatchPositionSuccessCallback).toBeDefined();
    if (mockWatchPositionSuccessCallback) {
      mockWatchPositionSuccessCallback(TD_01 as GeolocationPosition);
    } else {
      throw new Error('watchPosition success callback not set in mock.');
    }
    await nextTick()
    expect(lat.value).toBe(TD_01.coords.latitude);
  });

  it('UTC-01.03: useGeolocation.lng TC-01', async () => {
    init();
    expect(watcherId.value).toBe(MOCKED_WATCH_ID);
    expect(mockWatchPositionSuccessCallback).toBeDefined();
    if (mockWatchPositionSuccessCallback) {
      mockWatchPositionSuccessCallback(TD_01 as GeolocationPosition);
    } else {
      throw new Error('watchPosition success callback not set in mock.');
    }
    await nextTick()
    expect(lng.value).toBe(TD_01.coords.longitude);
  });

  it('UTC-01.04: useGeolocation.stopGPS() TC-01', async () => {
    init();
    if (mockWatchPositionSuccessCallback) {
      mockWatchPositionSuccessCallback(TD_01 as GeolocationPosition);
    }
    await nextTick();
    expect(watcherId.value).toBe(MOCKED_WATCH_ID);
    expect(lat.value).toBeDefined();
    const result: boolean = stopGPS();
    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(MOCKED_WATCH_ID);
    expect(watcherId.value).toBeNull();
    expect(lat.value).toBeNull();
    expect(lng.value).toBeNull();
    expect(result).toBe(true)
  });
});
