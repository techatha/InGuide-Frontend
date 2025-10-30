// src/composables/useTurnByTurn.ts

import { ref, computed } from 'vue'
import * as turf from '@turf/turf'
import type { NavigationGraph } from '@/types/path' // Import MapNode
import { useNavigationStore } from '@/stores/navigation'
import { useMapInfoStore } from '@/stores/mapInfo'
import { usePositioningSystem } from './usePositioningSystem'

const WALKING_SPEED_MPS = 1.4 // meters per second

export function useTurnByTurn() {
  const navigationStore = useNavigationStore()
  const mapInfo = useMapInfoStore() // To get floor info
  const position = usePositioningSystem()

  // --- State Refs ---
  const instructions = ref<string[]>([])
  const directions = ref<string[]>([]) // 'STRAIGHT', 'LEFT', 'RIGHT', 'U-TURN', 'PORTAL', 'FINISH'
  const essentialNodeIds = ref<string[]>([])
  const currentStepIndex = ref(0)
  const distanceToNextTurn = ref(0)
  const isAtDestination = ref(false)
  const totalDistance = ref(0)
  const estimatedTime = ref(0)
  const arrivalTime = ref<Date | null>(null)

  // A map to store which floor each node ID belongs to
  const nodeToFloorMap = new Map<string, number>() // Map nodeId -> floor number

  // --- Computed Properties for the UI ---
  const currentInstruction = computed(() => instructions.value[currentStepIndex.value] ?? null)
  const currentDirection = computed(() => directions.value[currentStepIndex.value] ?? null)
  const nextInstruction = computed(() => instructions.value[currentStepIndex.value + 1] ?? null)
  const nextDirection = computed(() => directions.value[currentStepIndex.value + 1] ?? null)

  /**
   * Generates a consolidated list of turn-by-turn instructions from a path and graph.
   */
  function generateInstructions(pathIds: string[], graph: NavigationGraph, radHeading: number) {
    // --- Reset State ---
    instructions.value = []
    directions.value = []
    essentialNodeIds.value = []
    currentStepIndex.value = 0
    isAtDestination.value = false
    nodeToFloorMap.clear() // Clear the floor map for the new route

    if (pathIds.length < 2) {
      console.warn('Path too short to generate instructions.')
      instructions.value = ['Cannot generate route.']
      directions.value = ['FINISH']
      return
    }

    // --- 1. Build Node-to-Floor Lookup ---
    // Use the graphs stored on each floor object in mapInfo
    mapInfo.floors.forEach((floor) => {
      if (floor.graph && floor.graph.nodes) {
        floor.graph.nodes.forEach((node) => {
          nodeToFloorMap.set(node.id, floor.floor)
        })
      }
    })
    // Also add nodes from the currentRouteGraph (like POIs/temp node)
    // This helps find floors for nodes not in the base floor graphs
    graph.nodes.forEach((node) => {
      if (!nodeToFloorMap.has(node.id)) {
        // This is a simple fallback, assuming a node not in the floor graphs
        // belongs to the *current* floor (e.g., the temp user node)
        if (position.currentUserFloor.value !== null) {
            nodeToFloorMap.set(node.id, position.currentUserFloor.value);
        }
        // console.warn(`Node ${node.id} not found in floor graphs.`);
      }
    })

    // --- 2. Calculate Bearings ---
    const nodes = graph.nodes
    const bearings: number[] = []
    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = nodes.get(pathIds[i])?.coordinates
      const to = nodes.get(pathIds[i + 1])?.coordinates
      if (!from || !to) {
        bearings.push(NaN)
        continue
      }
      const fromNode = nodes.get(pathIds[i])
      const toNode = nodes.get(pathIds[i + 1])
      if (
        fromNode?.portalGroup &&
        toNode?.portalGroup &&
        fromNode.portalGroup === toNode.portalGroup
      ) {
        bearings.push(NaN) // Skip bearing for portal travel
      } else {
        bearings.push(calculateBearing(from, to))
      }
    }

    // --- 3. Starting Instruction ---
    let startingInstruction = 'Start navigation'
    let initialTurn = 'STRAIGHT'
    const firstValidBearingIndex = bearings.findIndex((b) => !isNaN(b))
    if (firstValidBearingIndex !== -1) {
      const firstSegmentBearing = bearings[firstValidBearingIndex]
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
    instructions.value.push(startingInstruction)
    directions.value.push(initialTurn)
    essentialNodeIds.value.push(pathIds[0])

    // --- 4. Main Instruction Loop ---
    let currentStraightDistance = 0
    for (let i = 0; i < pathIds.length - 1; i++) {
      const currentNode = nodes.get(pathIds[i])
      const nextNode = nodes.get(pathIds[i + 1])
      const nodeAfterNext = i + 2 < pathIds.length ? nodes.get(pathIds[i + 2]) : undefined

      if (!currentNode || !nextNode) continue

      const segmentDistance = calculateDistance(currentNode.coordinates, nextNode.coordinates)

      // --- Check for Portal Transition ---
      const isEnteringPortal =
        nextNode.portalGroup && nodeAfterNext?.portalGroup === nextNode.portalGroup

      if (isEnteringPortal) {
        currentStraightDistance += segmentDistance // Add distance leading to portal

        if (currentStraightDistance > 1) {
          instructions.value.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`)
          directions.value.push('STRAIGHT')
          essentialNodeIds.value.push(pathIds[i + 1]) // Portal entrance
        }
        currentStraightDistance = 0

        const destFloor = nodeToFloorMap.get(nodeAfterNext!.id) // nodeAfterNext is defined if isEnteringPortal is true
        const floorText = destFloor !== undefined ? ` to Floor ${destFloor}` : ''
        const portalName = nextNode.portalGroup

        instructions.value.push(`Take ${portalName}${floorText}.`)
        directions.value.push('PORTAL')
        essentialNodeIds.value.push(pathIds[i + 1]) // Portal entrance
        essentialNodeIds.value.push(pathIds[i + 2]!) // Portal exit

        i++ // IMPORTANT: Skip the next segment (portal node to portal node)
        continue
      }

      // --- Normal Segment ---
      currentStraightDistance += segmentDistance

      if (i + 1 < bearings.length && !isNaN(bearings[i]) && !isNaN(bearings[i + 1])) {
        const diff = bearings[i + 1] - bearings[i]
        const turn = getTurnInstruction(diff)

        if (turn !== 'STRAIGHT') {
          if (currentStraightDistance > 1) {
            instructions.value.push(
              `Go straight for ${Math.round(currentStraightDistance)} meters.`,
            )
            directions.value.push('STRAIGHT')
            essentialNodeIds.value.push(pathIds[i + 1])
          }
          currentStraightDistance = 0

          let instruction = turn === 'U-TURN' ? 'Make a U-turn' : `Turn ${turn.toLowerCase()}`
          const poiAtTurn = mapInfo.findPOIbyId(pathIds[i + 1])?.poi
          if (poiAtTurn?.name) {
            instruction += ` at ${poiAtTurn.name}`
          }
          instruction += '.'

          instructions.value.push(instruction)
          directions.value.push(turn)
          essentialNodeIds.value.push(pathIds[i + 1])
        }
      }
    }

    // --- 5. Handle Final Straight Segment ---
    if (currentStraightDistance > 1) {
      instructions.value.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`)
      directions.value.push('STRAIGHT')
    }

    // --- 6. Arrival Instruction ---
    instructions.value.push('You have arrived at your destination.')
    directions.value.push('FINISH')
    essentialNodeIds.value.push(pathIds[pathIds.length - 1])

    // --- 7. Initial Metrics ---
    // Use the *actual* start node (the temp node) for the first metric calculation
    const startNode = nodes.get(pathIds[0]);
    if (startNode) {
      updateRouteMetrics(startNode.coordinates);
    }

    console.log('Generated Instructions:', instructions.value)
    console.log('Generated Directions:', directions.value)
    console.log('Essential Nodes:', essentialNodeIds.value)
  }

  /**
   * Updates the user's progress along the route, advancing the current instruction step.
   * This is the function you asked for, with both proximity and confirmation checks.
   */
  function updateUserProgress(userPos: [number, number]) {
    const graph = navigationStore.currentRouteGraph
    const fullPathIds = navigationStore.navigationRoute
    const essentialIds = essentialNodeIds.value
    const currentFloor = position.currentUserFloor.value

    if (!graph || !graph.nodes || fullPathIds.length === 0 || essentialIds.length === 0) {
      distanceToNextTurn.value = 0
      return
    }

    // --- Arrival Check ---
    const destinationNodeId = navigationStore.destinationID ?? '' // Use stored destination ID
    const destinationNode = graph.nodes.get(destinationNodeId)
    const destinationFloor = nodeToFloorMap.get(destinationNodeId)
    if (destinationNode) {
      const userPoint = turf.point(switchLatLng(userPos))
      const destPoint = turf.point(switchLatLng(destinationNode.coordinates))
      const distToDest = turf.distance(userPoint, destPoint, { units: 'meters' })
      const arrivalThreshold = 5 // meters
      if (currentFloor === destinationFloor && distToDest < arrivalThreshold) {
        isAtDestination.value = true
        currentStepIndex.value = instructions.value.length - 1
        distanceToNextTurn.value = 0
        updateRouteMetrics(userPos)
        return
      }
    }

    // --- Check if already on the last instruction step ---
    if (currentStepIndex.value >= essentialIds.length - 1) {
      updateRouteMetrics(userPos)
      if (destinationNode) {
        const userPoint = turf.point(switchLatLng(userPos))
        const destPoint = turf.point(switchLatLng(destinationNode.coordinates))
        distanceToNextTurn.value = Math.round(
          turf.distance(userPoint, destPoint, { units: 'meters' }),
        )
      } else {
        distanceToNextTurn.value = 0
      }
      return
    }

    // --- Advance Instruction Logic ---
    const nextTargetNodeId = essentialIds[currentStepIndex.value + 1]
    const nextTargetNode = graph.nodes.get(nextTargetNodeId)
    let instructionAdvancedThisCycle = false; // Flag to prevent double advance

    // --- 1. Proximity Check (Primary) ---
    if (nextTargetNode) {
      const userPoint = turf.point(switchLatLng(userPos))
      const targetPoint = turf.point(switchLatLng(nextTargetNode.coordinates))
      const distanceToNext = turf.distance(userPoint, targetPoint, { units: 'meters' })
      distanceToNextTurn.value = Math.round(distanceToNext)
      updateRouteMetrics(userPos) // Update total time/distance

      const updateThreshold = 8 // meters
      if (distanceToNext < updateThreshold) {
        console.log(currentInstruction.value, "Next node :", nextTargetNode?.id)
        currentStepIndex.value++
        instructionAdvancedThisCycle = true; // Mark that we advanced

        // Check if the instruction we just *completed* was a portal
        const completedInstructionDirection = directions.value[currentStepIndex.value - 1];
        if (completedInstructionDirection === 'PORTAL') {
          const portalExitNodeId = essentialIds[currentStepIndex.value];
          const newFloor = nodeToFloorMap.get(portalExitNodeId);
          if (newFloor !== undefined && newFloor !== null) {
            position.setCurrentFloor(newFloor);
          } else {
            console.warn(`Could not determine floor after portal (Proximity) at node ${portalExitNodeId}`);
          }
        }

        // Recalculate distance to the *new* next turn
        const newNextTargetId = essentialIds[currentStepIndex.value + 1];
        const newNextTargetNode = newNextTargetId ? graph.nodes.get(newNextTargetId) : null;
        if (newNextTargetNode) {
          const newTargetPoint = turf.point(switchLatLng(newNextTargetNode.coordinates));
          distanceToNextTurn.value = Math.round(
            turf.distance(userPoint, newTargetPoint, { units: 'meters' }),
          )
        } else {
          // If no new target, calculate distance to final destination
          if(destinationNode){
            distanceToNextTurn.value = Math.round(turf.distance(userPoint, turf.point(switchLatLng(destinationNode.coordinates)), { units: 'meters' }));
          } else {
             distanceToNextTurn.value = 0;
          }
        }
      }
    } else {
      console.error(`Could not find next target node: ${nextTargetNodeId}`);
      distanceToNextTurn.value = 0
      updateRouteMetrics(userPos)
    }

    // --- 2. Confirmation Check (Fallback) ---
    // Only run if proximity didn't already advance the instruction
    if (!instructionAdvancedThisCycle && currentStepIndex.value < essentialIds.length - 1) {
      const currentTargetNodeId = essentialIds[currentStepIndex.value];
      const currentTargetInFullPathIndex = fullPathIds.indexOf(currentTargetNodeId);

      let closestFullPathSegmentIndex = -1;
      let minDistanceToFullPathSegment = Infinity;

      for (let i = 0; i < fullPathIds.length - 1; i++) {
        const fromCoord = graph.nodes.get(fullPathIds[i])?.coordinates;
        const toCoord = graph.nodes.get(fullPathIds[i + 1])?.coordinates;
        if (!fromCoord || !toCoord) continue;

        const fromNode = graph.nodes.get(fullPathIds[i]);
        const toNode = graph.nodes.get(fullPathIds[i + 1]);
        if (fromNode?.portalGroup && toNode?.portalGroup && fromNode.portalGroup === toNode.portalGroup) {
          continue; // Skip portal segments for snapping
        }

        const line = turf.lineString([switchLatLng(fromCoord), switchLatLng(toCoord)]);
        const point = turf.point(switchLatLng(userPos));
        // Use pointToLineDistance for accurate "off-track" distance
        const dist = turf.pointToLineDistance(point, line, { units: 'meters' });

        if (dist < minDistanceToFullPathSegment) {
          minDistanceToFullPathSegment = dist;
          closestFullPathSegmentIndex = i;
        }
      }

      // If user's closest segment is at or after the current target's segment, advance
      if (closestFullPathSegmentIndex >= currentTargetInFullPathIndex && currentTargetInFullPathIndex !== -1) {
        console.log(`Confirmation Check Passed: Advancing step.`);
        currentStepIndex.value++;

        // --- DUPLICATED LOGIC ---
        // Check if the instruction we just *completed* was a portal
        const completedInstructionDirection = directions.value[currentStepIndex.value - 1];
        if (completedInstructionDirection === 'PORTAL') {
          const portalExitNodeId = essentialIds[currentStepIndex.value];
          const newFloor = nodeToFloorMap.get(portalExitNodeId);
          if (newFloor !== undefined && newFloor !== null) {
            position.setCurrentFloor(newFloor);
          } else {
            console.warn(`Could not determine floor after portal (Confirmation) at node ${portalExitNodeId}`);
          }
        }

        // Recalculate distance to the *new* next turn
        const newNextTargetId = essentialIds[currentStepIndex.value + 1];
        const newNextTargetNode = newNextTargetId ? graph.nodes.get(newNextTargetId) : null;
        if (newNextTargetNode) {
          const userPoint = turf.point(switchLatLng(userPos));
          const newTargetPoint = turf.point(switchLatLng(newNextTargetNode.coordinates));
          distanceToNextTurn.value = Math.round(turf.distance(userPoint, newTargetPoint, { units: 'meters' }));
        } else {
          if (destinationNode) {
            distanceToNextTurn.value = Math.round(turf.distance(turf.point(switchLatLng(userPos)), turf.point(switchLatLng(destinationNode.coordinates)), { units: 'meters' }));
          } else {
            distanceToNextTurn.value = 0;
          }
        }
        // --- END DUPLICATED LOGIC ---
      }
    }
  }

  /**
   * Calculates the total remaining time and distance for the route.
   */
  function updateRouteMetrics(userPosition: [number, number]) {
    const fullPathIds = navigationStore.navigationRoute
    const graph = navigationStore.currentRouteGraph
    if (!graph || !graph.nodes || fullPathIds.length < 2) {
      totalDistance.value = 0
      estimatedTime.value = 0
      arrivalTime.value = null
      return
    }

    const nodes = graph.nodes
    const userPoint = turf.point(switchLatLng(userPosition))

    // 1. Find which segment user is on
    let closestSegmentIndex = -1
    let minDistanceToSegment = Infinity
    let snappedPointOnLine: turf.helpers.Coord | undefined = undefined

    for (let i = 0; i < fullPathIds.length - 1; i++) {
      const from = nodes.get(fullPathIds[i])?.coordinates
      const to = nodes.get(fullPathIds[i + 1])?.coordinates
      if (!from || !to) continue
      const fromNode = nodes.get(fullPathIds[i])
      const toNode = nodes.get(fullPathIds[i + 1])
      if (
        fromNode?.portalGroup &&
        toNode?.portalGroup &&
        fromNode.portalGroup === toNode.portalGroup
      ) {
        continue
      }
      const line = turf.lineString([switchLatLng(from), switchLatLng(to)])
      const snapped = turf.nearestPointOnLine(line, userPoint)
      const distToSegment = turf.pointToLineDistance(userPoint, line, { units: 'meters' })
      if (distToSegment < minDistanceToSegment) {
        minDistanceToSegment = distToSegment
        closestSegmentIndex = i
        snappedPointOnLine = snapped.geometry.coordinates
      }
    }

    if (closestSegmentIndex === -1 || !snappedPointOnLine) {
      console.warn('Could not reliably snap user to route for metrics update.')
      totalDistance.value = 0
      estimatedTime.value = 0
      arrivalTime.value = null
      return
    }

    // --- 2. Calculate REMAINING TIME directly ---
    let remainingWalkingDistance = 0
    let remainingPortalTimeSeconds = 0

    // Time for the remainder of the current segment (walking)
    const endOfCurrentSegmentNode = nodes.get(fullPathIds[closestSegmentIndex + 1])
    if (endOfCurrentSegmentNode) {
      const partialSegmentDistance = turf.distance(
        snappedPointOnLine,
        switchLatLng(endOfCurrentSegmentNode.coordinates),
        { units: 'meters' },
      )
      remainingWalkingDistance += partialSegmentDistance
    }

    // Time for all subsequent segments
    for (let i = closestSegmentIndex + 1; i < fullPathIds.length - 1; i++) {
      const fromNode = nodes.get(fullPathIds[i])
      const toNode = nodes.get(fullPathIds[i + 1])
      if (fromNode && toNode) {
        if (
          fromNode.portalGroup &&
          toNode.portalGroup &&
          fromNode.portalGroup === toNode.portalGroup
        ) {
          const edges = graph.adjacencyList.get(fullPathIds[i])
          const portalEdge = edges?.find((e) => e.targetNodeId === fullPathIds[i + 1])
          const portalTimeSeconds = portalEdge?.weight ?? 30
          remainingPortalTimeSeconds += portalTimeSeconds
        } else {
          const segmentWalkingDistance = calculateDistance(fromNode.coordinates, toNode.coordinates)
          remainingWalkingDistance += segmentWalkingDistance
        }
      }
    }
    // --- End Time Calculation ---

    // --- 3. Update reactive state ---
    const totalRemainingTimeSeconds =
      remainingWalkingDistance / WALKING_SPEED_MPS + remainingPortalTimeSeconds

    totalDistance.value = Math.round(
      remainingWalkingDistance + remainingPortalTimeSeconds * WALKING_SPEED_MPS,
    )
    estimatedTime.value = Math.ceil(totalRemainingTimeSeconds / 60)
    arrivalTime.value = new Date(Date.now() + totalRemainingTimeSeconds * 1000)
  }

  // Expose all reactive state and functions
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

function calculateDistance(from: [number, number], to: [number, number]): number {
  const fromPoint = turf.point(switchLatLng(from))
  const toPoint = turf.point(switchLatLng(to))
  return turf.distance(fromPoint, toPoint, { units: 'meters' })
}

function calculateBearing(from: [number, number], to: [number, number]): number {
  const point1 = turf.point(switchLatLng(from))
  const point2 = turf.point(switchLatLng(to))
  return turf.bearing(point1, point2)
}

function getTurnInstruction(angleDiff: number): string {
  let normalizedDiff = angleDiff % 360
  if (normalizedDiff > 180) normalizedDiff -= 360
  if (normalizedDiff <= -180) normalizedDiff += 360

  const straightThreshold = 25
  const uTurnThreshold = 160

  if (Math.abs(normalizedDiff) <= straightThreshold) {
    return 'STRAIGHT'
  } else if (normalizedDiff > straightThreshold && normalizedDiff < uTurnThreshold) {
    return 'RIGHT'
  } else if (normalizedDiff < -straightThreshold && normalizedDiff > -uTurnThreshold) {
    return 'LEFT'
  } else {
    return 'U-TURN'
  }
}

function switchLatLng(pos: [number, number]): [number, number] {
  return [pos[1], pos[0]]
}
