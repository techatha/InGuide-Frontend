import { describe, it, expect } from 'vitest'
import { rotateToWorldFrame } from '@/composables/usePositioningSystem'

const TD_01 = {accelerometer: {x: 1, y: 2, z: 3}, accIncludeGravity: {x: 1, y: 2, z: 11.8}, rotationRate: {alpha: 0, beta: 0, gamma: 0}}
const TD_02 = {accelerometer: {x: 1, y: 0, z: 0}, accIncludeGravity: {x: 1, y: 0, z: 9.8}, rotationRate: {alpha: 90, beta: 0, gamma: 0}}
const TD_03 = {accelerometer: {x: 1, y: 0, z: 0}, accIncludeGravity: {x: 1, y: 0, z: 9.8}, rotationRate: {alpha: 0, beta: 180, gamma: 0}}
const TD_04 = {accelerometer: {x: 0, y: 1, z: 0}, accIncludeGravity: {x: 0, y: 1, z: 9.8}, rotationRate: {alpha: 0, beta: 0, gamma: 90}}

describe('Unit tests on usePositioningSystem.ts', () => {
  it('UTC-05.01: Test-usePositioningSystem.rotateToWorldFrame() TC-01', () => {
    const result = rotateToWorldFrame(TD_01.accelerometer, TD_01.rotationRate)
    expect(result).toEqual(TD_01.accelerometer)
  })

  it('UTC-05.01: Test-usePositioningSystem.rotateToWorldFrame() TC-02', () => {
    const result = rotateToWorldFrame(TD_02.accelerometer, TD_02.rotationRate)
    expect(result.x).toBeCloseTo(0, 3)
    expect(result.y).toBeCloseTo(1, 3)
    expect(result.z).toBeCloseTo(0, 3)
  })

  it('UTC-05.01: Test-usePositioningSystem.rotateToWorldFrame() TC-03', () => {
    const result = rotateToWorldFrame(TD_03.accelerometer, TD_03.rotationRate)
    expect(result.x).toBeCloseTo(-1, 3)
    expect(result.y).toBeCloseTo(0, 3)
    expect(result.z).toBeCloseTo(0, 3)
  })

  it('UTC-05.01: Test-usePositioningSystem.rotateToWorldFrame() TC-04', () => {
    const result = rotateToWorldFrame(TD_04.accelerometer, TD_04.rotationRate)
    expect(result.x).toBeCloseTo(0, 3)
    expect(result.y).toBeCloseTo(0, 3)
    expect(result.z).toBeCloseTo(1, 3)
  })
})
