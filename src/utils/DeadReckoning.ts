import type { Acceleration } from '@/types/IMU'
import { DistancePredictor } from './DistancePredictor'
import { coordinatesTransform } from './CoordinateTransformer'
import type { Beacon } from '@/types/beacon'

const t = coordinatesTransform()
const pred = DistancePredictor()

export class DeadReckoning {
  east: number
  north: number
  velocity: number
  lastBeaconId: string | null
  maxVelocity: number

  constructor(lat: number = 0.0, lng: number = 0.0, maxAccel: number = 99, lastBeaconId?: string) {
    const ENUcoords = t.latLngToENU(lat, lng)
    this.east = ENUcoords[0]
    this.north = ENUcoords[1]
    this.velocity = 0
    this.lastBeaconId = lastBeaconId ?? null
    this.maxVelocity = maxAccel
  }

  /**
   * Step the dead reckoning using IMU data and heading.
   * Snap movement to 8 cardinal/intercardinal directions.
   * @param imu IMU reading
   * @param heading Current device heading (rad, 0 = North, clockwise)
   * @param dt Delta time (seconds)
   * @returns [lat, lng] predicted
   */
  step(
    acc: Acceleration,
    heading: number,
    dt: number,
    mode: number
  ) {
    // Project accel along heading
    const forward_accel = (acc.x ?? 0) * Math.sin(heading) + (acc.y ?? 0) * Math.cos(heading)

    // Update velocity
    this.velocity += forward_accel * dt
    this.velocity = Math.min(Math.max(this.velocity, 0), this.maxVelocity)

    let result
    switch (mode) {
      case 1: // Forward
        result = pred.forward(this.east, this.north, this.velocity, heading, 0, dt)

        // Snap displacement to 8 directions
        const deltaE = result.e - this.east
        const deltaN = result.n - this.north
        const angle = Math.atan2(deltaE, deltaN) // atan2(East, North)
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
        const mag = Math.sqrt(deltaE ** 2 + deltaN ** 2)
        this.east += mag * Math.sin(snappedAngle)
        this.north += mag * Math.cos(snappedAngle)
        break

      case 2: // Turn
        result = pred.turn(this.east, this.north, this.velocity, heading, 0, dt)
        this.east = result.e
        this.north = result.n
        this.velocity = result.v
        break

      default: // Halt
        result = pred.halt(this.east, this.north)
        this.east = result.e
        this.north = result.n
        this.velocity = 0
        break
    }

    return {
      latLng: t.ENUToLatLng(this.east, this.north),
      velocity: this.velocity,
    }
  }

  /**
   * Snap to a beacon position if this beacon hasn't been visited yet
   */
  resetToBeacon(beacon: Beacon) {
    if (this.lastBeaconId !== beacon.beaconId) {
      this.lastBeaconId = beacon.beaconId
      const ENUcoords = t.latLngToENU(beacon.latLng[0], beacon.latLng[1])
      this.east = ENUcoords[0]
      this.north = ENUcoords[1]
      this.velocity = 0
    }
  }

  getLatLng(): [number, number] {
    return t.ENUToLatLng(this.east, this.north)
  }
}
