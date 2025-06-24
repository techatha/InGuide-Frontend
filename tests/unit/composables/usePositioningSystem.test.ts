import { describe, it, expect } from 'vitest'
import { rotateToWorldFrame } from '@/composables/usePositioningSystem'

const TD_01 = {accelerometer: {x: 1, y: 2, z: 3}, accIncludeGravity: {x: 1, y: 2, z: 11.8}, rotationRate: {alpha: 0, beta: 0, gamma: 0}}
const TD_02 = {accelerometer: {x: 1, y: 0, z: 0}, accIncludeGravity: {x: 1, y: 0, z: 9.8}, rotationRate: {alpha: 90, beta: 0, gamma: 0}}
const TD_03 = {accelerometer: {x: 1, y: 0, z: 0}, accIncludeGravity: {x: 1, y: 0, z: 9.8}, rotationRate: {alpha: 0, beta: 180, gamma: 0}}
const TD_04 = {accelerometer: {x: 0, y: 1, z: 0}, accIncludeGravity: {x: 0, y: 1, z: 9.8}, rotationRate: {alpha: 0, beta: 0, gamma: 90}}

describe('UTC-05: Test-usePositioningSystem', () => {
  it('TC-01: Should return same vector when no rotation applied', () => {
    const result = rotateToWorldFrame(TD_01.accelerometer, TD_01.rotationRate)
    expect(result).toEqual(TD_01.accelerometer)
  })

  it('TC-02: Should rotate 90° yaw (Z) axis - X becomes Y', () => {
    const result = rotateToWorldFrame(TD_02.accelerometer, TD_02.rotationRate)
    expect(result.x).toBeCloseTo(0, 3)
    expect(result.y).toBeCloseTo(1, 3)
    expect(result.z).toBeCloseTo(0, 3)
  })

  it('TC-03: Should rotate 180° pitch (Y) axis - X flips to -X', () => {
    const result = rotateToWorldFrame(TD_03.accelerometer, TD_03.rotationRate)
    expect(result.x).toBeCloseTo(-1, 3)
    expect(result.y).toBeCloseTo(0, 3)
    expect(result.z).toBeCloseTo(0, 3)
  })

  it('TC-04: Should rotate 90° roll (X) axis - Y becomes Z', () => {
    const result = rotateToWorldFrame(TD_04.accelerometer, TD_04.rotationRate)
    expect(result.x).toBeCloseTo(0, 3)
    expect(result.y).toBeCloseTo(0, 3)
    expect(result.z).toBeCloseTo(1, 3)
  })
})
