import * as math from 'mathjs'

export class ExtendedKalmanFilter {
  x: math.Matrix
  P: math.Matrix
  H: math.Matrix
  R: math.Matrix // Default measurement noise
  I: math.Matrix

  constructor(
    initialState: number[], // e.g., [east, north, velocity, heading]
    P: math.Matrix,
    H: math.Matrix,
    R: math.Matrix,
  ) {
    this.x = math.matrix(initialState.map((v) => [v]))
    this.P = P
    this.H = H
    this.R = R // This is the default R, it will not be changed by the update step.
    this.I = math.identity(initialState.length) as math.Matrix
  }

  predict(F: math.Matrix, Q: math.Matrix, x?: math.Matrix) {
    if (x) {
      this.x = x
    } else {
      this.x = math.multiply(F, this.x) as math.Matrix
    }
    this.P = math.add(math.multiply(math.multiply(F, this.P), math.transpose(F)), Q) as math.Matrix
  }

  /**
   * Updates the state with a new measurement.
   * @param z - The measurement matrix.
   * @param R_override - An optional measurement noise matrix to use for this specific update.
   */
  update(z: math.Matrix, R_override?: math.Matrix) {
    // Use the override R matrix if it's provided for this update.
    // Otherwise, fall back to the default measurement noise stored in this.R.
    const R = R_override || this.R

    const y = math.subtract(z, math.multiply(this.H, this.x)) as math.Matrix
    const S = math.add(
      math.multiply(math.multiply(this.H, this.P), math.transpose(this.H)),
      R, // Use the determined R matrix for this single update cycle.
    ) as math.Matrix
    const K = math.multiply(
      math.multiply(this.P, math.transpose(this.H)),
      math.inv(S),
    ) as math.Matrix

    this.x = math.add(this.x, math.multiply(K, y)) as math.Matrix
    this.P = math.multiply(math.subtract(this.I, math.multiply(K, this.H)), this.P) as math.Matrix
  }

  setState(x: math.Matrix) {
    this.x = x
  }

  getState(): number[] {
    return (this.x.toArray() as number[][]).flat()
  }
}
