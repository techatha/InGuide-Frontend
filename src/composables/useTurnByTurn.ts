// src/composables/useTurnByTurn.ts

import { ref, computed } from 'vue'
import * as turf from '@turf/turf'
import type { NavigationGraph, MapNode } from '@/types/path' // Import MapNode
import { useNavigationStore } from '@/stores/navigation'
import { useMapInfoStore } from '@/stores/mapInfo'

const WALKING_SPEED_MPS = 1.4 // meters per second

export function useTurnByTurn() {
  const navigationStore = useNavigationStore()
  const mapInfo = useMapInfoStore() // To get floor info

  const instructions = ref<string[]>([])
  const directions = ref<string[]>([]) // 'STRAIGHT', 'LEFT', 'RIGHT', 'U-TURN', 'PORTAL', 'FINISH'
  const essentialNodeIds = ref<string[]>([])
  const currentStepIndex = ref(0)
  const distanceToNextTurn = ref(0)
  const isAtDestination = ref(false)
  const totalDistance = ref(0)
  const estimatedTime = ref(0)
  const arrivalTime = ref<Date | null>(null)

  const currentInstruction = computed(() => instructions.value[currentStepIndex.value] ?? null)
  const currentDirection = computed(() => directions.value[currentStepIndex.value] ?? null)
  const nextInstruction = computed(() => instructions.value[currentStepIndex.value + 1] ?? null)
  const nextDirection = computed(() => directions.value[currentStepIndex.value + 1] ?? null)

  function generateInstructions(pathIds: string[], graph: NavigationGraph, radHeading: number) {
    // --- Reset State ---
    instructions.value = []
    directions.value = []
    essentialNodeIds.value = []
    currentStepIndex.value = 0
    isAtDestination.value = false

    if (pathIds.length < 2) {
      console.warn('Path too short to generate instructions.')
      instructions.value = ['Cannot generate route.']
      directions.value = ['FINISH']
      return
    }

    // --- 1. Build Node-to-Floor Lookup ---
    const nodeToFloorMap = new Map<string, number>() // Map nodeId -> floor number
    mapInfo.floors.forEach((floor) => {
      if (floor.graph && floor.graph.nodes) {
        floor.graph.nodes.forEach((node) => {
          nodeToFloorMap.set(node.id, floor.floor)
        })
      }
    })
    // Also add nodes from the superGraph that might be missing (like merged POIs)
    // This assumes POIs belong to the floor they were merged onto.
    // A more robust solution might involve adding floorId during merge.
    graph.nodes.forEach((node) => {
      if (!nodeToFloorMap.has(node.id)) {
        // Find the floor this POI/Temp node is closest to based on graph structure
        // (This part is complex, for now, we assume essential nodes exist in original floor graphs)
        // console.warn(`Node ${node.id} not found in floor graphs, floor TBD.`);
      }
    })


    // --- 2. Calculate Bearings ---
    const nodes = graph.nodes
    const bearings: number[] = [] // Bearing *between* nodes i and i+1
    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = nodes.get(pathIds[i])?.coordinates
      const to = nodes.get(pathIds[i + 1])?.coordinates
      if (!from || !to) {
        bearings.push(NaN) // Mark invalid segments
        continue
      }
      // Don't calculate bearing for portal transitions (will be NaN anyway if coords are same)
      const fromNode = nodes.get(pathIds[i])
      const toNode = nodes.get(pathIds[i + 1])
      if (fromNode?.portalGroup && toNode?.portalGroup && fromNode.portalGroup === toNode.portalGroup) {
         bearings.push(NaN) // Skip bearing for portal travel
      } else {
         bearings.push(calculateBearing(from, to))
      }
    }

    // --- 3. Starting Instruction ---
    let startingInstruction = 'Start navigation'
    let initialTurn = 'STRAIGHT'
    const firstValidBearingIndex = bearings.findIndex(b => !isNaN(b));
    if (firstValidBearingIndex !== -1) {
        const firstSegmentBearing = bearings[firstValidBearingIndex];
        const userHeadingDeg = (radHeading * 180) / Math.PI;
        const angleDiff = firstSegmentBearing - userHeadingDeg;
        initialTurn = getTurnInstruction(angleDiff);
        switch (initialTurn) {
            case 'STRAIGHT': startingInstruction = 'Proceed straight ahead to begin.'; break;
            case 'LEFT': startingInstruction = 'Turn to your left to begin.'; break;
            case 'RIGHT': startingInstruction = 'Turn to your right to begin.'; break;
            case 'U-TURN': startingInstruction = 'Turn around to begin.'; break;
        }
    }
    instructions.value.push(startingInstruction);
    directions.value.push(initialTurn);
    essentialNodeIds.value.push(pathIds[0]);


    // --- 4. Main Instruction Loop ---
    let currentStraightDistance = 0
    for (let i = 0; i < pathIds.length - 1; i++) {
      const currentNode = nodes.get(pathIds[i])
      const nextNode = nodes.get(pathIds[i + 1])
      const nodeAfterNext = i + 2 < pathIds.length ? nodes.get(pathIds[i + 2]) : undefined

      if (!currentNode || !nextNode) continue // Skip invalid segments

      const segmentDistance = calculateDistance(currentNode.coordinates, nextNode.coordinates);

      // --- Check for Portal Transition ---
      const isEnteringPortal = nextNode.portalGroup && nodeAfterNext?.portalGroup === nextNode.portalGroup;

      if (isEnteringPortal) {
        currentStraightDistance += segmentDistance // Add distance leading to portal

        // Announce straight distance before portal
        if (currentStraightDistance > 1) { // Threshold to avoid tiny segments
          instructions.value.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`);
          directions.value.push('STRAIGHT');
          essentialNodeIds.value.push(pathIds[i + 1]); // Essential node is the portal entrance
        }
        currentStraightDistance = 0; // Reset accumulator

        // Get destination floor
        const destFloor = nodeToFloorMap.get(nodeAfterNext.id);
        const floorText = destFloor !== undefined ? ` to Floor ${destFloor}` : '';
        const portalName = nextNode.portalGroup; // Use the group name

        instructions.value.push(`Take ${portalName}${floorText}.`);
        directions.value.push('PORTAL'); // Special direction for portals
        essentialNodeIds.value.push(pathIds[i + 1]); // Mark portal entrance
        essentialNodeIds.value.push(pathIds[i + 2]); // Mark portal exit

        i++; // IMPORTANT: Skip the next segment (portal node to portal node)
        continue; // Move to the next iteration
      }

      // --- Normal Segment ---
      currentStraightDistance += segmentDistance;

      // Check for a turn *after* this segment (if there's a segment after this one)
      if (i + 1 < bearings.length && !isNaN(bearings[i]) && !isNaN(bearings[i + 1])) {
          const diff = bearings[i + 1] - bearings[i];
          const turn = getTurnInstruction(diff);

          if (turn !== 'STRAIGHT') {
              if (currentStraightDistance > 1) { // Threshold
                  instructions.value.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`);
                  directions.value.push('STRAIGHT');
                  essentialNodeIds.value.push(pathIds[i + 1]); // Node where straight ends
              }
              currentStraightDistance = 0;

              // Add the turn instruction
              let instruction = (turn === 'U-TURN') ? 'Make a U-turn' : `Turn ${turn.toLowerCase()}`;
              // Optional: Add POI name at turn if needed (using mapInfo.findPOIbyId)
              const poiAtTurn = mapInfo.findPOIbyId(pathIds[i + 1])?.poi;
              if (poiAtTurn?.name) {
                 instruction += ` at ${poiAtTurn.name}`;
              }
              instruction += '.';

              instructions.value.push(instruction);
              directions.value.push(turn);
              essentialNodeIds.value.push(pathIds[i + 1]); // Node where turn happens
          }
      }
    }

    // --- 5. Handle Final Straight Segment ---
    if (currentStraightDistance > 1) {
      instructions.value.push(`Go straight for ${Math.round(currentStraightDistance)} meters.`);
      directions.value.push('STRAIGHT');
      // No essential node needed here, next is arrival
    }

    // --- 6. Arrival Instruction ---
    instructions.value.push('You have arrived at your destination.');
    directions.value.push('FINISH');
    essentialNodeIds.value.push(pathIds[pathIds.length - 1]); // Destination node

    // --- 7. Initial Metrics ---
    updateUserProgress(nodes.get(pathIds[0])!.coordinates); // Calculate initial distance/time

    console.log("Generated Instructions:", instructions.value);
    console.log("Generated Directions:", directions.value);
    console.log("Essential Nodes:", essentialNodeIds.value);
  }

  // --- updateUserProgress and updateRouteMetrics ---
  // These functions generally work okay with the super graph concept,
  // as they calculate remaining distance along the *entire* path.
  // We need to ensure essentialNodeIds includes portal exit points correctly.
  // The logic inside should be reviewed, but the overall structure is likely fine.

   function updateUserProgress(userPos: [number, number]) {
    const graph = navigationStore.currentRouteGraph // Use the temp graph with user node
    const fullPathIds = navigationStore.navigationRoute
    const essentialIds = essentialNodeIds.value

    if (!graph || fullPathIds.length === 0 || essentialIds.length === 0) {
      distanceToNextTurn.value = 0
      return
    }

    // Check arrival first
    const destinationNodeId = essentialIds[essentialIds.length - 1] // Last essential node is destination
    const destinationNode = graph.nodes.get(destinationNodeId)
    if (destinationNode) {
        const userPoint = turf.point(switchLatLng(userPos));
        const destPoint = turf.point(switchLatLng(destinationNode.coordinates));
        const distToDest = turf.distance(userPoint, destPoint, { units: 'meters' });
        const arrivalThreshold = 5; // meters
        if (distToDest < arrivalThreshold) {
            isAtDestination.value = true;
            currentStepIndex.value = instructions.value.length - 1; // Jump to final instruction
            distanceToNextTurn.value = 0;
            updateRouteMetrics(userPos); // Update final metrics
            return; // Don't process further steps if arrived
        }
    }


    // Ensure we don't go past the last instruction before arrival
    if (currentStepIndex.value >= essentialIds.length - 1) {
      updateRouteMetrics(userPos) // Keep updating distance to destination
      // Calculate distance to final node if needed
      if(destinationNode){
         const userPoint = turf.point(switchLatLng(userPos));
         const destPoint = turf.point(switchLatLng(destinationNode.coordinates));
         distanceToNextTurn.value = Math.round(turf.distance(userPoint, destPoint, { units: 'meters' }));
      } else {
         distanceToNextTurn.value = 0;
      }
      return
    }

    // Get the coordinates of the *next* essential node
    const nextTargetNodeId = essentialIds[currentStepIndex.value + 1]
    const nextTargetNode = graph.nodes.get(nextTargetNodeId)

    if (nextTargetNode) {
      const userPoint = turf.point(switchLatLng(userPos))
      const targetPoint = turf.point(switchLatLng(nextTargetNode.coordinates))
      const distanceToNext = turf.distance(userPoint, targetPoint, { units: 'meters' })
      distanceToNextTurn.value = Math.round(distanceToNext)

      updateRouteMetrics(userPos) // Update total distance/time remaining

      // --- Proximity Check ---
      const updateThreshold = 8 // meters
      if (distanceToNext < updateThreshold) {
        currentStepIndex.value++
        // Recalculate distance to the *new* next turn immediately
        const newNextTargetId = essentialIds[currentStepIndex.value + 1];
        const newNextTargetNode = graph.nodes.get(newNextTargetId);
        if(newNextTargetNode){
           const newTargetPoint = turf.point(switchLatLng(newNextTargetNode.coordinates));
           distanceToNextTurn.value = Math.round(turf.distance(userPoint, newTargetPoint, { units: 'meters' }));
        } else {
            distanceToNextTurn.value = 0; // Or handle arrival case
        }
        return // Instruction updated
      }
    } else {
        // Should not happen if essentialNodeIds is correct
        distanceToNextTurn.value = 0
        updateRouteMetrics(userPos)
    }

    // Confirmation check (Have we passed the current node?) - might be less critical now
    // but can help prevent getting stuck.
    // Consider if this is still needed or complicates things with portals.
  }

  function updateRouteMetrics(userPosition: [number, number]) {
    // This function calculates distance remaining along the *entire* path
    // using turf.nearestPointOnLine. It should handle multi-floor paths correctly
    // as long as the fullPathIds and graph are correct.
     const fullPathIds = navigationStore.navigationRoute
     // Use currentRouteGraph because it contains the temporary user node,
     // ensuring the path starts correctly from the user's snapped position.
     const graph = navigationStore.currentRouteGraph
     if (!graph || !graph.nodes || fullPathIds.length < 2) {
        totalDistance.value = 0;
        estimatedTime.value = 0;
        arrivalTime.value = null;
        return;
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

       // Skip distance calculation across portal nodes (weight handled elsewhere)
       const fromNode = nodes.get(fullPathIds[i]);
       const toNode = nodes.get(fullPathIds[i + 1]);
       if (fromNode?.portalGroup && toNode?.portalGroup && fromNode.portalGroup === toNode.portalGroup) {
           continue; // Don't snap user to the "portal travel" segment
       }

       const line = turf.lineString([switchLatLng(from), switchLatLng(to)])
       const snapped = turf.nearestPointOnLine(line, userPoint)
       // Use distance from point to line segment (snapped.properties.dist is distance along infinite line)
       const distToSegment = turf.pointToLineDistance(userPoint, line, { units: 'meters' });

       if (distToSegment < minDistanceToSegment) {
         minDistanceToSegment = distToSegment
         closestSegmentIndex = i
         snappedPointOnLine = snapped.geometry.coordinates // Point ON the line segment
       }
     }

     if (closestSegmentIndex === -1 || !snappedPointOnLine) return

     // 2. Calculate remaining distance
     let remainingDistance = 0

     // Distance from snapped point to end of current segment
     const endOfCurrentSegmentNode = nodes.get(fullPathIds[closestSegmentIndex + 1])
     if (endOfCurrentSegmentNode) {
       remainingDistance += turf.distance(
         snappedPointOnLine,
         switchLatLng(endOfCurrentSegmentNode.coordinates),
         { units: 'meters' },
       )
     }

    // Distance of all subsequent segments
    for (let i = closestSegmentIndex + 1; i < fullPathIds.length - 1; i++) {
        const fromNode = nodes.get(fullPathIds[i]);
        const toNode = nodes.get(fullPathIds[i + 1]);
        if (fromNode && toNode) {
            // Check if this is a portal segment - use its weight directly
            if (fromNode.portalGroup && toNode.portalGroup && fromNode.portalGroup === toNode.portalGroup) {
                // Find the edge weight in the graph's adjacency list
                const edges = graph.adjacencyList.get(fullPathIds[i]);
                const portalEdge = edges?.find(e => e.targetNodeId === fullPathIds[i+1]);
                // Convert weight (time in seconds?) back to an estimated distance
                // Or maybe the weight IS distance? Assuming weight = time here.
                const portalTimeSeconds = portalEdge?.weight ?? 30; // Default 30s
                remainingDistance += portalTimeSeconds * WALKING_SPEED_MPS; // Estimate distance based on time
            } else {
                // Regular segment, calculate geographic distance
                remainingDistance += calculateDistance(fromNode.coordinates, toNode.coordinates);
            }
        }
    }


     // 3. Update reactive state
     totalDistance.value = Math.round(remainingDistance)
     const timeInSeconds = remainingDistance / WALKING_SPEED_MPS
     estimatedTime.value = Math.ceil(timeInSeconds / 60)
     arrivalTime.value = new Date(Date.now() + timeInSeconds * 1000)
  }

  return {
    // ... (existing return values) ...
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

// Use Turf for distance calculation
function calculateDistance(from: [number, number], to: [number, number]): number {
    const fromPoint = turf.point(switchLatLng(from));
    const toPoint = turf.point(switchLatLng(to));
    return turf.distance(fromPoint, toPoint, { units: 'meters' });
}

// Rest of helpers (calculateBearing, getTurnInstruction, switchLatLng) are likely fine.
function calculateBearing(from: [number, number], to: [number, number]): number {
    // Turf uses [lon, lat]
    const point1 = turf.point(switchLatLng(from));
    const point2 = turf.point(switchLatLng(to));
    return turf.bearing(point1, point2); // Returns degrees (-180 to 180)
}

function getTurnInstruction(angleDiff: number): string {
    // Normalize angle difference to be between -180 and 180
    let normalizedDiff = angleDiff % 360;
    if (normalizedDiff > 180) normalizedDiff -= 360;
    if (normalizedDiff <= -180) normalizedDiff += 360;

    // Define thresholds (adjust as needed)
    const straightThreshold = 25; // degrees
    const uTurnThreshold = 160; // degrees

    if (Math.abs(normalizedDiff) <= straightThreshold) {
        return 'STRAIGHT';
    } else if (normalizedDiff > straightThreshold && normalizedDiff < uTurnThreshold) {
        return 'RIGHT';
    } else if (normalizedDiff < -straightThreshold && normalizedDiff > -uTurnThreshold) {
        return 'LEFT';
    } else {
        return 'U-TURN';
    }
}

function switchLatLng(pos: [number, number]): [number, number] {
    return [pos[1], pos[0]]; // Switch for Turf.js [lon, lat] format
}
