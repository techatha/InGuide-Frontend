import type { Acceleration, RotationRate } from '@/types/IMU'
import { create, all } from 'mathjs'

const math = create(all)
// world-frame transform function
export function rotateToWorldFrame(acc: Acceleration, rotation: RotationRate) {
  // alpha = yaw (rotationRate.alpha)
  // beta = pitch (rotationRate.beta)
  // gamma = roll (rotationRate.gamma)

  if (rotation.alpha == null || rotation.beta == null || rotation.gamma == null) {
    console.warn('Rotation values are null, skipping transform')
    return acc // fallback: return raw acceleration
  }
  if (acc.x == null || acc.y == null || acc.z == null) {
    console.warn('Acceleration values are null, skipping transform')
    return acc // fallback: return raw acceleration
  }

  const yaw = (rotation?.alpha * Math.PI) / 180
  const pitch = (rotation.beta * Math.PI) / 180
  const roll = (rotation.gamma * Math.PI) / 180

  // Rotation order: ZYX (yaw → pitch → roll)
  const Rz = math.matrix([
    [Math.cos(yaw), -Math.sin(yaw), 0],
    [Math.sin(yaw), Math.cos(yaw), 0],
    [0, 0, 1],
  ])
  const Ry = math.matrix([
    [Math.cos(pitch), 0, Math.sin(pitch)],
    [0, 1, 0],
    [-Math.sin(pitch), 0, Math.cos(pitch)],
  ])
  const Rx = math.matrix([
    [1, 0, 0],
    [0, Math.cos(roll), -Math.sin(roll)],
    [0, Math.sin(roll), Math.cos(roll)],
  ])

  const rotationMatrix = math.multiply(Rz, Ry, Rx)
  const accVec = math.matrix([[acc.x], [acc.y], [acc.z]])

  const worldVec = math.multiply(rotationMatrix, accVec)
  return {
    x: worldVec.get([0, 0]),
    y: worldVec.get([1, 0]),
    z: worldVec.get([2, 0]),
  }
}
