import * as math from 'mathjs'

export class ExtendedKalmanFilter {
  x: math.Matrix
  P: math.Matrix
  H: math.Matrix
  R: math.Matrix
  I: math.Matrix

  constructor(initialPosition: [number, number], orien: number) {
    // states (x) : [east, north, velocity, heading_yaw]
    this.x = math.matrix([[initialPosition[0]], [initialPosition[1]], [0], [orien]])
    this.P = math.diag([1, 1, 2, 0.1]) as math.Matrix
    this.H = math.matrix([
      [1, 0, 0, 0], // measure east
      [0, 1, 0, 0], // measure north
      [0, 0, 0, 1], // measure heading
    ])
    this.R = math.diag([100, 100, 0.01]) as math.Matrix // measurement noise for [east, north, heading]
    this.I = math.identity(4) as math.Matrix
  }

  predict(x: math.Matrix, F: math.Matrix, Q: math.Matrix) {
    this.x = x
    this.P = math.multiply(math.multiply(F, this.P), math.transpose(F))
    this.P = math.add(this.P, Q)
  }

  update(z: math.Matrix) {
    const y = math.subtract(z, math.multiply(this.H, this.x))
    const S = math.add(math.multiply(math.multiply(this.H, this.P), math.transpose(this.H)), this.R)
    // Kalman Gain (K)
    const K = math.multiply(math.multiply(this.P, math.transpose(this.H)), math.inv(S))
    const I_KH = math.subtract(this.I, math.multiply(K, this.H))

    this.x = math.add(this.x, math.multiply(K, y))
    this.P = math.add(
      math.multiply(math.multiply(I_KH, this.P), math.transpose(I_KH)),
      math.multiply(math.multiply(K, this.R), math.transpose(K)),
    )
  }

  getState(): [number, number] {
    // console.log("Filtered => ", this.x.get([3, 0]))
    return [this.x.get([0, 0]), this.x.get([1, 0])]
  }
}
