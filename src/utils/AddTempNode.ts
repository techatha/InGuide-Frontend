import type { NavigationGraph, MapNode, MapEdge } from '@/types/path'
import { reactive } from 'vue';

/**
 * Helper: calculate Euclidean distance between two points
 */
function distance(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Helper: project a point onto a line segment (edge)
 */
function projectPointOnEdge(
  point: [number, number],
  start: [number, number],
  end: [number, number],
): { projected: [number, number]; t: number } {
  const vx = end[0] - start[0]
  const vy = end[1] - start[1]
  const wx = point[0] - start[0]
  const wy = point[1] - start[1]

  const lenSquared = vx * vx + vy * vy
  if (lenSquared === 0) return { projected: start, t: 0 }

  let t = (wx * vx + wy * vy) / lenSquared
  t = Math.max(0, Math.min(1, t))
  return { projected: [start[0] + t * vx, start[1] + t * vy], t }
}

export function addTemporaryNode(
  graph: NavigationGraph,
  coords: [number, number]
): string {
  const tempId = `temp_${Date.now()}`;
  const tempNode: MapNode = { id: tempId, coordinates: reactive(coords) };

  let closestEdge: {
    fromId: string
    toId: string
    distance: number
    t: number
    projected: [number, number]
  } | null = null;

  // 1. Find the closest edge to the temporary node's coordinates
  for (const [fromId, edges] of graph.adjacencyList.entries()) {
    const fromNode = graph.nodes.get(fromId)!;
    for (const edge of edges) {
      const toNode = graph.nodes.get(edge.targetNodeId)!;
      const { projected, t } = projectPointOnEdge(coords, fromNode.coordinates, toNode.coordinates);
      const d = distance(coords, projected);

      if (!closestEdge || d < closestEdge.distance) {
        closestEdge = { fromId, toId: toNode.id, distance: d, t, projected };
      }
    }
  }

  if (!closestEdge) throw new Error("No edges in graph");

  // 2. Add the temporary node
  graph.nodes.set(tempId, tempNode);
  graph.adjacencyList.set(tempId, []);

  // 3. Remove the original edge and its reciprocal
  const edgesFrom = graph.adjacencyList.get(closestEdge.fromId)!;
  const edgeIndexFrom = edgesFrom.findIndex(e => e.targetNodeId === closestEdge.toId);
  if (edgeIndexFrom >= 0) edgesFrom.splice(edgeIndexFrom, 1);

  const edgesTo = graph.adjacencyList.get(closestEdge.toId)!;
  const edgeIndexTo = edgesTo.findIndex(e => e.targetNodeId === closestEdge.fromId);
  if (edgeIndexTo >= 0) edgesTo.splice(edgeIndexTo, 1);

  // 4. Add the two new path segments (in both directions)
  const fromNode = graph.nodes.get(closestEdge.fromId)!;
  const toNode = graph.nodes.get(closestEdge.toId)!;
  const weight1 = distance(fromNode.coordinates, tempNode.coordinates);
  const weight2 = distance(tempNode.coordinates, toNode.coordinates);

  // from -> temp
  edgesFrom.push({ targetNodeId: tempId, weight: weight1 });
  graph.adjacencyList.get(tempId)!.push({ targetNodeId: fromNode.id, weight: weight1 });

  // temp -> to
  graph.adjacencyList.get(tempId)!.push({ targetNodeId: toNode.id, weight: weight2 });
  edgesTo.push({ targetNodeId: tempId, weight: weight2 });

  return tempId;
}

export function cloneGraph(graph: NavigationGraph): NavigationGraph {
  const newNodes = new Map<string, MapNode>()
  const newAdj = new Map<string, MapEdge[]>()

  graph.nodes.forEach((node, id) => {
    newNodes.set(id, { ...node })
  })

  graph.adjacencyList.forEach((edges, id) => {
    newAdj.set(id, edges.map(e => ({ ...e })))
  })

  return { nodes: newNodes, adjacencyList: newAdj }
}
