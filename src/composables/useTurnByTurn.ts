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

  const isAtDestination = ref(false)

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
    isAtDestination.value = false

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

    // Step 3: Consolidate the raw turns into a final, user-friendly list using the Accumulator Method.
    const finalInstructions: string[] = [startingInstruction];
    const finalDirections: string[] = [initialTurn];
    if (pathIds.length > 0) {
      essentialNodeIds.value.push(pathIds[0]);
    }

    let currentStraightDistance = 0;

    // Loop through each segment of the path
    for (let i = 0; i < turns.length; i++) {
      const segmentIds = [pathIds[i], pathIds[i + 1]];
      currentStraightDistance += calculatePathDistance(segmentIds, graph);

      const turn = turns[i];

      // If we hit a real turn, announce the straight distance we've traveled and the turn itself.
      if (turn !== 'STRAIGHT') {
        if (currentStraightDistance > 0) {
          finalInstructions.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`);
          finalDirections.push('STRAIGHT');
          // This instruction's "target" is the node where you start the turn.
          essentialNodeIds.value.push(pathIds[i + 1]);
        }

        // Reset the distance accumulator
        currentStraightDistance = 0;

        // Now, add the turn instruction
        const turnNodeId = pathIds[i + 1];
        const poi = mapInfo.findPOIbyId(turnNodeId)?.poi;
        let instruction = (turn === 'U-TURN') ? 'Make a U-turn' : `Turn ${turn.toLowerCase()}`;
        if (poi?.name) {
          instruction += ` at ${poi.name}`;
        }
        instruction += '.';

        finalInstructions.push(instruction);
        finalDirections.push(turn);
        essentialNodeIds.value.push(turnNodeId);
      }
    }

    // After the loop, if there's any remaining straight distance, announce it.
    if (currentStraightDistance > 0) {
        finalInstructions.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`);
        finalDirections.push('STRAIGHT');
    }

    finalInstructions.push('You have arrived at your destination.');
    finalDirections.push('FINISH');
    if (pathIds.length > 0) {
      essentialNodeIds.value.push(pathIds[pathIds.length - 1]);
    }

    const startNode = graph.nodes.get(pathIds[0])?.coordinates;
    if (startNode) {
      updateRouteMetrics(startNode);
    }

    directions.value = finalDirections;
    instructions.value = finalInstructions;

    console.log(finalInstructions);
    return finalInstructions;
}

  /**
   * Updates the user's progress along the route, advancing the current instruction step.
   * @param userPos - The user's current coordinates.
   */
  function updateUserProgress(userPos: [number, number]) {
    const graph = navigationStore.navigationGraph
    const fullPathIds = navigationStore.navigationRoute

    if (!graph || fullPathIds.length === 0) {
      distanceToNextTurn.value = 0
      return
    }

    const destinationNodeId = fullPathIds[fullPathIds.length - 1]
    const destinationNode = graph.nodes.get(destinationNodeId)

    if (destinationNode) {
      const userPoint = turf.point(switchLatLng(userPos))
      const destinationPoint = turf.point(switchLatLng(destinationNode.coordinates))
      const distanceToDestination = turf.distance(userPoint, destinationPoint, { units: 'meters' })

      const arrivalThreshold = 5 // 5 meters
      if (distanceToDestination < arrivalThreshold) {
        isAtDestination.value = true
      }
    }

    // console.log("is at destination", isAtDestination.value)

    if (
      essentialNodeIds.value.length < 2 ||
      currentStepIndex.value >= instructions.value.length - 1
    ) {
      distanceToNextTurn.value = 0
      updateRouteMetrics(userPos)
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

    const endOfCurrentSegment = nodes.get(fullPathIds[closestSegmentIndex + 1])?.coordinates
    if (endOfCurrentSegment) {
      remainingDistance += turf.distance(
        snappedPointOnLine,
        switchLatLng(endOfCurrentSegment),
        { units: 'meters' },
      )
    }

    const remainingPathIds = fullPathIds.slice(closestSegmentIndex + 2)
    if (remainingPathIds.length > 0) {
      remainingDistance += calculatePathDistance(remainingPathIds, graph)
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
    isAtDestination,
  }
}

// --- Helper Functions ---

/**
 * Calculates the total distance in meters for a given path of node IDs.
 * @param pathIds - An array of node IDs.
 * @param graph - The navigation graph.
 * @returns The total distance in meters.
 */
function calculatePathDistance(pathIds: string[], graph: NavigationGraph): number {
  let totalDistance = 0
  const nodes = graph.nodes

  for (let i = 0; i < pathIds.length - 1; i++) {
    const fromNode = nodes.get(pathIds[i])
    const toNode = nodes.get(pathIds[i + 1])

    if (fromNode && toNode) {
      const fromPoint = turf.point(switchLatLng(fromNode.coordinates))
      const toPoint = turf.point(switchLatLng(toNode.coordinates))
      totalDistance += turf.distance(fromPoint, toPoint, { units: 'meters' })
    }
  }
  return totalDistance
}

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
