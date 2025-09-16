import type { NavigationGraph, MapNode, MapEdge } from '@/types/path'

export function convertToGraph(
  nodesInput: MapNode[] | Map<string, MapNode>,
  adjacencyInput: Record<string, MapEdge[]> | Map<string, MapEdge[]>
): NavigationGraph {
  const nodes = new Map<string, MapNode>()
  const adjacencyList = new Map<string, MapEdge[]>()

  // Convert nodes
  if (nodesInput instanceof Map) {
    nodesInput.forEach((node, id) => nodes.set(id, node))
  } else {
    nodesInput.forEach(node => nodes.set(node.id, node))
  }

  // Convert adjacency list
  if (adjacencyInput instanceof Map) {
    adjacencyInput.forEach((edges, id) => adjacencyList.set(id, edges))
  } else {
    Object.entries(adjacencyInput).forEach(([id, edges]) => adjacencyList.set(id, edges))
  }

  return { nodes, adjacencyList }
}
