import type { NavigationGraph, MapNode } from '@/types/path'

export function findPathAStar(
  graph: NavigationGraph,
  startId: string,
  goalId: string
): string[] | null {
  const startNode = graph.nodes.get(startId)
  const goalNode = graph.nodes.get(goalId)
  console.log(graph)
  if (!startNode || !goalNode) throw new Error('Start or goal node not found in graph')

  const openSet = new Set<string>([startId])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>()
  const fScore = new Map<string, number>()

  graph.nodes.forEach((_, id) => {
    gScore.set(id, Infinity)
    fScore.set(id, Infinity)
  })

  gScore.set(startId, 0)
  fScore.set(startId, heuristic(startNode, goalNode))

  while (openSet.size > 0) {
    // Pick node with lowest fScore
    const current = Array.from(openSet).reduce((a, b) =>
      (fScore.get(a) ?? Infinity) < (fScore.get(b) ?? Infinity) ? a : b
    )

    if (current === goalId) return reconstructPath(cameFrom, current)

    openSet.delete(current)

    const neighbors = graph.adjacencyList.get(current) ?? []
    for (const edge of neighbors) {
      const neighborNode = graph.nodes.get(edge.targetNodeId)
      if (!neighborNode) continue // <--- skip missing nodes

      const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight
      if (tentativeG < (gScore.get(edge.targetNodeId) ?? Infinity)) {
        cameFrom.set(edge.targetNodeId, current)
        gScore.set(edge.targetNodeId, tentativeG)
        fScore.set(
          edge.targetNodeId,
          tentativeG + heuristic(neighborNode, goalNode)
        )
        openSet.add(edge.targetNodeId)
      }
    }
  }

  return null // no path found
}

function heuristic(a: MapNode, b: MapNode): number {
  const dx = a.coordinates[0] - b.coordinates[0]
  const dy = a.coordinates[1] - b.coordinates[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function reconstructPath(
  cameFrom: Map<string, string>,
  current: string
): string[] {
  const path = [current]
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!
    path.unshift(current)
  }
  return path
}
