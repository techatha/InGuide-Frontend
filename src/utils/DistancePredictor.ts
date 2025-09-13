export function DistancePredictor() {
  const maxVelocity = 5.0
  const dampingFactor = 0.98

  function forward(e: number, n: number, v: number, yaw: number, acc: number, dt: number) {
    const east_n1 = e - v * Math.sin(yaw) * dt
    const nort_n1 = n + v * Math.cos(yaw) * dt
    const velo_n1 = Math.min((v + acc * dt) * dampingFactor, maxVelocity)
    // console.log('Forward (m/s) => ', velo_n1)
    return { e: east_n1, n: nort_n1, v: velo_n1 }
  }

  function turn(e: number, n: number, v: number, yaw: number, acc: number, dt: number) {
    const east_n1 = e - v * Math.sin(yaw) * dt
    const nort_n1 = n + v * Math.cos(yaw) * dt
    const velo_n1 = Math.min((v + acc * dt) * dampingFactor, maxVelocity)
    // console.log('Turn (m/s) => ', velo_n1)
    return { e: east_n1, n: nort_n1, v: velo_n1 }
  }

  function halt(e: number, n: number) {
    const east_n1 = e
    const nort_n1 = n
    const velo_n1 = 0
    // console.log('Halt (m/s) => ', velo_n1)
    return { e: east_n1, n: nort_n1, v: velo_n1 }
  }

  return {
    forward,
    halt,
    turn,
  }
}
