export interface Acceleration {
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface RotationRate {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

export interface IMUData {
  accelerometer: Acceleration;
  accIncludeGravity: Acceleration;
  rotationRate: RotationRate;
}
