import type { MapNode, MapEdge, NavigationGraph } from "@/types/path";

// Nodes
const node1: MapNode = {id: "a", coordinates: [18.799661920915920, 98.95048809046690]}
const node2: MapNode = {id: "b", coordinates: [18.799661920915920, 98.95070944127089]}

const node3: MapNode = {id: "c", coordinates: [18.799417428901960, 98.95048809046690]}
const node4: MapNode = {id: "d", coordinates: [18.799417428901960, 98.95070944127089]}

const node5: MapNode = {id: "e", coordinates: [18.799162936888000, 98.95048809046690]}
const node6: MapNode = {id: "f", coordinates: [18.799162936888000, 98.95070944127089]}

// Make Node List
const nodesMap = new Map<string, MapNode>();
nodesMap.set(node1.id, node1);
nodesMap.set(node2.id, node2);
nodesMap.set(node3.id, node3);
nodesMap.set(node4.id, node4);
nodesMap.set(node5.id, node5);
nodesMap.set(node6.id, node6);

// Connect Nodes (Edges)
const adjacencyListMap = new Map<string, MapEdge[]>();
adjacencyListMap.set(node1.id, [
  {targetNodeId: node2.id, weight: 50},
]);
adjacencyListMap.set(node2.id, [
  {targetNodeId: node1.id, weight: 50},
  {targetNodeId: node4.id, weight: 50},
]);
adjacencyListMap.set(node3.id, [
  {targetNodeId: node4.id, weight: 50},
]);
adjacencyListMap.set(node4.id, [
  {targetNodeId: node2.id, weight: 50},
  {targetNodeId: node3.id, weight: 50},
  {targetNodeId: node6.id, weight: 50},
]);
adjacencyListMap.set(node5.id, [
  {targetNodeId: node6.id, weight: 50},
]);
adjacencyListMap.set(node6.id, [
  {targetNodeId: node5.id, weight: 50},
  {targetNodeId: node4.id, weight: 50},
]);

// Combine Nodes List and Edges List
const mockGraph: NavigationGraph = {
  nodes: nodesMap,
  adjacencyList: adjacencyListMap
};

export async function getPaths(): Promise<NavigationGraph> {
  return new Promise((reslove) => {
    setTimeout(() => {reslove(mockGraph)}, 500);
  })
}
