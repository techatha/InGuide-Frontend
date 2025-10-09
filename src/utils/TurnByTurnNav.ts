import { ref, computed } from 'vue'
import * as turf from '@turf/turf'
import type { NavigationGraph } from '@/types/path'

export function useTurnByTurn() {
  const instructions = ref<string[]>([])
  const currentStepIndex = ref(0)
  const currentInstruction = computed(() => instructions.value[currentStepIndex.value] ?? null)

  /**
   * Generate turn-by-turn instructions from path + graph
   */
  function generateInstructions(pathIds: string[], graph: NavigationGraph) {
    const nodes = graph.nodes
    const turns: string[] = []

    // Compute bearings for each segment
    const bearings: number[] = []
    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = nodes.get(pathIds[i])?.coordinates
      const to = nodes.get(pathIds[i + 1])?.coordinates
      if (!from || !to) continue
      const bearing = calculateBearing(from, to)
      bearings.push(bearing)
    }

    // Compare consecutive bearings → generate turn text
    for (let i = 0; i < bearings.length - 1; i++) {
      const diff = bearings[i + 1] - bearings[i]
      const turn = getTurnInstruction(diff)
      const nodeName = pathIds[i + 1]
      turns.push(`${turn} at node ${nodeName}`)
    }

    // Add start and end
    turns.unshift('Start navigation')
    turns.push('You have arrived at your destination')

    instructions.value = turns
    currentStepIndex.value = 0
    return turns
  }

  /**
   * Update user's progress along the path
   */
  function updateUserProgress(userPos: [number, number], pathIds: string[], graph: NavigationGraph) {
    // Find the closest segment to user position
    let closestIndex = 0
    let minDist = Infinity

    for (let i = 0; i < pathIds.length - 1; i++) {
      const from = graph.nodes.get(pathIds[i])?.coordinates
      const to = graph.nodes.get(pathIds[i + 1])?.coordinates
      if (!from || !to) continue

      const line = turf.lineString([switchLatLng(from), switchLatLng(to)])
      const point = turf.point(switchLatLng(userPos))
      const snapped = turf.nearestPointOnLine(line, point)
      const dist = snapped.properties?.dist ?? Infinity

      if (dist < minDist) {
        minDist = dist
        closestIndex = i
      }
    }

    // Update which instruction we're currently near
    if (closestIndex > currentStepIndex.value && closestIndex < instructions.value.length - 1) {
      currentStepIndex.value = closestIndex
    }
  }

  return {
    instructions,
    currentInstruction,
    generateInstructions,
    updateUserProgress,
  }
}

/* ------------------ Helpers ------------------ */

function calculateBearing(from: [number, number], to: [number, number]) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const rad = Math.atan2(dy, dx)
  const deg = (rad * 180) / Math.PI
  return (deg + 360) % 360
}

function getTurnInstruction(angleDiff: number) {
  const normalized = ((angleDiff + 540) % 360) - 180 // normalize to [-180, 180]
  if (Math.abs(normalized) < 30) return 'Go straight'
  if (normalized > 30 && normalized < 150) return 'Turn right'
  if (normalized < -30 && normalized > -150) return 'Turn left'
  return 'Make a U-turn'
}

function switchLatLng(pos: [number, number]): [number, number] {
  return [pos[1], pos[0]]
}
