import { ref, computed } from 'vue'
import * as turf from '@turf/turf'
import type { NavigationGraph } from '@/types/path'
import { useNavigationStore } from '@/stores/navigation'
import { useMapInfoStore } from '@/stores/mapInfo'


const WALKING_SPEED_MPS = 1.4
/**
 * A Vue Composable for handling turn-by-turn navigation logic.
 */
export function useTurnByTurn() {
  const navigationStore = useNavigationStore()
  const mapInfo = useMapInfoStore()

  const instructions = ref<string[]>([])
  const directions = ref<string[]>([])
  const essentialNodeIds = ref<string[]>([])
  const currentStepIndex = ref(0)
  const distanceToNextTurn = ref(0)

  const totalDistance = ref(0) // Remaining distance in meters
  const estimatedTime = ref(0) // Remaining time in minutes
  const arrivalTime = ref<Date | null>(null) // ETA as a Date object

  const currentInstruction = computed(() => instructions.value[currentStepIndex.value] ?? null)
  const currentDirection = computed(() => directions.value[currentStepIndex.value] ?? null)
  const nextInstruction = computed(() => instructions.value[currentStepIndex.value + 1] ?? null)
  const nextDirection = computed(() => directions.value[currentStepIndex.value + 1] ?? null)

  /**
   * Generates a consolidated list of turn-by-turn instructions from a path and graph.
   * @param pathIds - An array of node IDs representing the route.
   * @param graph - The navigation graph containing node information.
   * @param radHeading - The user's initial heading in radians.
   */
  function generateInstructions(pathIds: string[], graph: NavigationGraph, radHeading: number) {
    // Reset state for the new route
    instructions.value = []
    directions.value = []
    essentialNodeIds.value = []
    currentStepIndex.value = 0

    // Step 1: Calculate the raw bearings and turns for the entire path.
    const nodes = graph.nodes
    const bearings: number[] = []
    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = nodes.get(pathIds[i])?.coordinates
      const to = nodes.get(pathIds[i + 1])?.coordinates
      if (!from || !to) continue
      bearings.push(calculateBearing(from, to))
    }

    const turns: string[] = []
    for (let i = 0; i < bearings.length - 1; i++) {
      const diff = bearings[i + 1] - bearings[i]
      turns.push(getTurnInstruction(diff))
    }

    // Step 2: Generate the dynamic starting instruction based on user's heading.
    let startingInstruction = 'Start navigation'
    let initialTurn = 'STRAIGHT'
    if (pathIds.length > 1) {
      const startNode = nodes.get(pathIds[0])?.coordinates
      const nextNode = nodes.get(pathIds[1])?.coordinates
      if (startNode && nextNode) {
        const firstSegmentBearing = calculateBearing(startNode, nextNode)
        const userHeadingDeg = (radHeading * 180) / Math.PI
        const angleDiff = firstSegmentBearing - userHeadingDeg
        initialTurn = getTurnInstruction(angleDiff)
        switch (initialTurn) {
          case 'STRAIGHT':
            startingInstruction = 'Proceed straight ahead to begin.'
            break
          case 'LEFT':
            startingInstruction = 'Turn to your left to begin.'
            break
          case 'RIGHT':
            startingInstruction = 'Turn to your right to begin.'
            break
          case 'U-TURN':
            startingInstruction = 'Turn around to begin.'
            break
        }
      }
    }

    // Step 3: Consolidate the raw turns into a final, user-friendly list.
    const finalInstructions: string[] = [startingInstruction]
    const finalDirections: string[] = [initialTurn]

    if (pathIds.length > 0) {
      essentialNodeIds.value.push(pathIds[0]) // The first instruction corresponds to the start node
    }

    let i = 0
    while (i < turns.length) {
      const currentTurn = turns[i]

      if (currentTurn === 'STRAIGHT') {
        let segmentEndIndex = i
        while (segmentEndIndex < turns.length && turns[segmentEndIndex] === 'STRAIGHT') {
          segmentEndIndex++
        }

        let totalDistance = 0
        for (let j = i; j < segmentEndIndex; j++) {
          const fromNode = nodes.get(pathIds[j + 1])
          const toNode = nodes.get(pathIds[j + 2])
          if (fromNode && toNode) {
            const fromPoint = turf.point(switchLatLng(fromNode.coordinates))
            const toPoint = turf.point(switchLatLng(toNode.coordinates))
            totalDistance += turf.distance(fromPoint, toPoint, { units: 'meters' })
          }
        }

        if (totalDistance > 0) {
          finalInstructions.push(`Go straight for ${Math.round(totalDistance)} meters.`)
          finalDirections.push('STRAIGHT')
          // This instruction's target is the node at the end of the straight segment
          essentialNodeIds.value.push(pathIds[segmentEndIndex + 1])
        }

        i = segmentEndIndex
      } else {
        const turnNodeId = pathIds[i + 1]
        const poi = mapInfo.findPOIbyId(turnNodeId)?.poi
        let instruction = ''

        if (currentTurn === 'U-TURN') {
          instruction = 'Make a U-turn'
        } else {
          instruction = `Turn ${currentTurn.toLowerCase()}`
        }

        if (poi?.name) {
          instruction += ` at ${poi.name}`
        }
        instruction += '.'
        finalInstructions.push(instruction)
        finalDirections.push(currentTurn)
        essentialNodeIds.value.push(turnNodeId) // This instruction corresponds to the turn node
        i++
      }
    }

    finalInstructions.push('You have arrived at your destination.')
    finalDirections.push('FINISH')
    if (pathIds.length > 0) {
      essentialNodeIds.value.push(pathIds[pathIds.length - 1]) // The last instruction is the destination node
    }

    const startNode = graph.nodes.get(pathIds[0])?.coordinates
    if (startNode) {
      updateRouteMetrics(startNode)
    }

    directions.value = finalDirections;
    instructions.value = finalInstructions
    return finalInstructions
  }

  /**
   * Updates the user's progress along the route, advancing the current instruction step.
   * @param userPos - The user's current coordinates.
   */
  function updateUserProgress(userPos: [number, number]) {
    const graph = navigationStore.navigationGraph
    const fullPathIds = navigationStore.navigationRoute

    if (
      !graph ||
      essentialNodeIds.value.length < 2 ||
      currentStepIndex.value >= instructions.value.length - 1
    ) {
      distanceToNextTurn.value = 0
      return
    }

    // --- Anticipatory Check: Are we close to the NEXT turn? ---
    const nextTargetNodeId = essentialNodeIds.value[currentStepIndex.value + 1]
    const nextTargetNode = graph.nodes.get(nextTargetNodeId)

    if (nextTargetNode) {
      const userPoint = turf.point(switchLatLng(userPos))
      const targetPoint = turf.point(switchLatLng(nextTargetNode.coordinates))
      const distanceToNext = turf.distance(userPoint, targetPoint, { units: 'meters' })
      distanceToNextTurn.value = Math.round(distanceToNext)

      updateRouteMetrics(userPos)

      const updateThreshold = 8 // meters
      if (distanceToNext < updateThreshold) {
        currentStepIndex.value++
        return // Instruction updated, we are done for this cycle.
      }
    }

    // --- Confirmation Check: Have we clearly passed the CURRENT turn? (Solves the long hallway problem) ---
    const currentTargetNodeId = essentialNodeIds.value[currentStepIndex.value]

    // Find which segment of the full path the user is closest to.
    let closestSegmentIndex = -1
    let minDistanceToSegment = Infinity
    for (let i = 0; i < fullPathIds.length - 1; i++) {
      const from = graph.nodes.get(fullPathIds[i])?.coordinates
      const to = graph.nodes.get(fullPathIds[i + 1])?.coordinates
      if (!from || !to) continue
      const line = turf.lineString([switchLatLng(from), switchLatLng(to)])
      const point = turf.point(switchLatLng(userPos))
      const snapped = turf.nearestPointOnLine(line, point)
      const dist = snapped.properties.dist ?? Infinity
      if (dist < minDistanceToSegment) {
        minDistanceToSegment = dist
        closestSegmentIndex = i
      }
    }

    // Find the index of our current target turn within the full path.
    const currentTargetInFullPathIndex = fullPathIds.indexOf(currentTargetNodeId)

    // If the user's closest segment is at or after the segment of the current target,
    // it means they have successfully passed it, so we can advance.
    if (
      closestSegmentIndex >= currentTargetInFullPathIndex &&
      currentTargetInFullPathIndex !== -1
    ) {
      currentStepIndex.value++
    }
  }

  // ADDED: A new helper function to calculate distance and time
  /**
   * Calculates the total distance, estimated time, and arrival time for the remaining route.
   * @param userPosition - The user's current coordinates.
   */
  function updateRouteMetrics(userPosition: [number, number]) {
    const fullPathIds = navigationStore.navigationRoute
    const graph = navigationStore.navigationGraph
    if (!graph || fullPathIds.length < 2) return

    const nodes = graph.nodes
    const userPoint = turf.point(switchLatLng(userPosition))

    // 1. Find which segment of the full path the user is closest to
    let closestSegmentIndex = -1
    let minDistanceToSegment = Infinity
    let snappedPointOnLine: turf.helpers.Coord | undefined = undefined

    for (let i = 0; i < fullPathIds.length - 1; i++) {
      const from = nodes.get(fullPathIds[i])?.coordinates
      const to = nodes.get(fullPathIds[i + 1])?.coordinates
      if (!from || !to) continue
      const line = turf.lineString([switchLatLng(from), switchLatLng(to)])
      const snapped = turf.nearestPointOnLine(line, userPoint)
      const dist = snapped.properties.dist ?? Infinity
      if (dist < minDistanceToSegment) {
        minDistanceToSegment = dist
        closestSegmentIndex = i
        snappedPointOnLine = snapped.geometry.coordinates
      }
    }

    if (closestSegmentIndex === -1 || !snappedPointOnLine) return

    // 2. Calculate remaining distance
    let remainingDistance = 0

    // Distance from user's snapped position to the end of the current segment
    const endOfCurrentSegment = nodes.get(fullPathIds[closestSegmentIndex + 1])?.coordinates
    if (endOfCurrentSegment) {
      remainingDistance += turf.distance(
        snappedPointOnLine,
        switchLatLng(endOfCurrentSegment),
        { units: 'meters' },
      )
    }

    // Add distances of all subsequent segments
    for (let i = closestSegmentIndex + 1; i < fullPathIds.length - 1; i++) {
      const from = nodes.get(fullPathIds[i])?.coordinates
      const to = nodes.get(fullPathIds[i + 1])?.coordinates
      if (from && to) {
        remainingDistance += turf.distance(switchLatLng(from), switchLatLng(to), {
          units: 'meters',
        })
      }
    }

    // 3. Update reactive state
    totalDistance.value = Math.round(remainingDistance)
    const timeInSeconds = remainingDistance / WALKING_SPEED_MPS
    estimatedTime.value = Math.ceil(timeInSeconds / 60)
    arrivalTime.value = new Date(Date.now() + timeInSeconds * 1000)
  }

  return {
    instructions,
    currentStepIndex,
    currentInstruction,
    nextInstruction,
    distanceToNextTurn,
    essentialNodeIds,
    generateInstructions,
    updateUserProgress,
    directions,
    currentDirection,
    nextDirection,
    totalDistance,
    estimatedTime,
    arrivalTime,
  }
}

// --- Helper Functions ---

function calculateBearing(from: [number, number], to: [number, number]) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const rad = Math.atan2(dy, dx)
  const deg = (rad * 180) / Math.PI
  return (deg + 360) % 360
}

function getTurnInstruction(angleDiff: number) {
  const normalized = ((angleDiff + 540) % 360) - 180
  if (Math.abs(normalized) < 30) return 'STRAIGHT'
  if (normalized > 30 && normalized < 150) return 'RIGHT'
  if (normalized < -30 && normalized > -150) return 'LEFT'
  return 'U-TURN'
}

function switchLatLng(pos: [number, number]): [number, number] {
  return [pos[1], pos[0]]
}
