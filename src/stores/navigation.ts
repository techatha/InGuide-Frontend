import type { NavigationGraph, MapEdge } from "@/types/path";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useNavigationStore = defineStore('navigation', () => {
  const destinationID = ref<string | null>(null)
  const navigationRoute = ref<string[]>([])
  const navigationGraph = ref<NavigationGraph | null>(null)

  const isNavigating = computed(() => navigationRoute.value.length > 0)

  const routeSubgraph = computed<NavigationGraph>(() => {
    const route = navigationRoute.value;
    const graph = navigationGraph.value;

    if (route.length === 0 || !graph || !graph.nodes || !graph.adjacencyList || graph.nodes.size === 0) {
      // FIX 1: Return a new Map() for adjacencyList
      return { nodes: new Map(), adjacencyList: new Map() };
    }

    const routeNodeIds = new Set(route);

    const subgraphNodes: NavigationGraph['nodes'] = new Map();
    // FIX 2: Instantiate adjacencyList as a new Map
    const subgraphAdjacencyList: NavigationGraph['adjacencyList'] = new Map();

    // 1. Filter Nodes (This was correct from last time)
    for (const nodeId of route) {
      if (graph.nodes.has(nodeId)) {
        subgraphNodes.set(nodeId, graph.nodes.get(nodeId)!);
      }
    }

    // 2. Filter the Adjacency List
    for (const nodeId of route) {
      // FIX 3: Use .get() to read from the adjacencyList Map
      const originalEdges = graph.adjacencyList.get(nodeId);

      if (originalEdges) {
        // FIX 4: Filter the edges array.
        // I'm assuming 'MapEdge' has a 'targetId' property.
        // Please check your 'MapEdge' type in '@/types/path'
        const filteredEdges: MapEdge[] = originalEdges.filter(edge =>
          routeNodeIds.has(edge.targetNodeId)
        );

        // FIX 5: Use .set() to write to the new Map
        if (filteredEdges.length > 0) {
          subgraphAdjacencyList.set(nodeId, filteredEdges);
        }
      }
    }

    return {
      nodes: subgraphNodes,
      adjacencyList: subgraphAdjacencyList,
    };
  });

  function setDestination(id: string, route?: string[]) {
    destinationID.value = id
    if (route) navigationRoute.value = route
  }

  function clearNavigation() {
    destinationID.value = null
    navigationRoute.value = []
  }

  function setNavigationRoute(route: string[]) {
    navigationRoute.value = route
  }

  function setNavigationGraph(graph: NavigationGraph) {
    navigationGraph.value = graph
  }

  return {
    destinationID,
    navigationRoute,
    navigationGraph,
    isNavigating,
    routeSubgraph,
    setDestination,
    clearNavigation,
    setNavigationRoute,
    setNavigationGraph,
  }
})
