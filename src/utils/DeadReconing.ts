import type { IMUData } from '@/types/IMU'
import { DistancePredictor } from './DistancePredictor'
import { coordinatesTransform } from './CoordinateTransformer'
import type { Beacon } from '@/types/beacon'

const t = coordinatesTransform()
const pred = DistancePredictor()

export class DeadReconing {
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
   * @param imu IMU reading
   * @param heading Current device heading (rad)
   * @param dt Delta time (seconds)
   * @returns [lat, lng] predicted
   */
  step(imu: IMUData, heading: number, dt: number): [number, number] {
    // Project accelerometer along heading
    const forward_accel =
      (imu.accelerometer.x ?? 0) * Math.sin(heading) +
      (imu.accelerometer.y ?? 0) * Math.cos(heading)

    // Update velocity
    this.velocity += forward_accel * dt
    this.velocity = Math.min(Math.max(this.velocity, 0), this.maxVelocity) // clamp 0..max

    // Predict new ENU position
    const newENU = pred.forward(this.east, this.north, this.velocity, heading, 0, dt)

    this.east = newENU.e
    this.north = newENU.n

    return t.ENUToLatLng(this.east, this.north)
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
      this.velocity = 0 // optionally reset velocity when snapping
    }
  }

  getLatLng(): [number, number] {
    return t.ENUToLatLng(this.east, this.north)
  }
}
