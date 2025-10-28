import type { NavigationGraph, MapEdge } from '@/types/path'
import { addTemporaryNode, cloneGraph } from '@/utils/AddTempNode'
import { findPathAStar } from '@/utils/AStarPathFinding'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type findPathResult = {
  pathIds: string[] | null
  clonedGraph: NavigationGraph
}

export const useNavigationStore = defineStore('navigation', () => {
  const destinationID = ref<string | null>(null)
  const navigationRoute = ref<string[]>([])

  const navigationGraph = ref<NavigationGraph | null>(null)
  const currentRouteGraph = ref<NavigationGraph | null>(null)

  const isNavigating = computed(() => navigationRoute.value.length > 0)

  const routeSubgraph = computed<NavigationGraph>(() => {
    const route = navigationRoute.value
    const graph = currentRouteGraph.value

    if (
      route.length === 0 ||
      !graph ||
      !graph.nodes ||
      !graph.adjacencyList ||
      graph.nodes.size === 0
    ) {
      // FIX 1: Return a new Map() for adjacencyList
      return { nodes: new Map(), adjacencyList: new Map() }
    }

    const routeNodeIds = new Set(route)

    const subgraphNodes: NavigationGraph['nodes'] = new Map()
    // FIX 2: Instantiate adjacencyList as a new Map
    const subgraphAdjacencyList: NavigationGraph['adjacencyList'] = new Map()

    // 1. Filter Nodes (This was correct from last time)
    for (const nodeId of route) {
      if (graph.nodes.has(nodeId)) {
        subgraphNodes.set(nodeId, graph.nodes.get(nodeId)!)
      }
    }

    // 2. Filter the Adjacency List
    for (const nodeId of route) {
      // FIX 3: Use .get() to read from the adjacencyList Map
      const originalEdges = graph.adjacencyList.get(nodeId)

      if (originalEdges) {
        // FIX 4: Filter the edges array.
        // I'm assuming 'MapEdge' has a 'targetId' property.
        // Please check your 'MapEdge' type in '@/types/path'
        const filteredEdges: MapEdge[] = originalEdges.filter((edge) =>
          routeNodeIds.has(edge.targetNodeId),
        )

        // FIX 5: Use .set() to write to the new Map
        if (filteredEdges.length > 0) {
          subgraphAdjacencyList.set(nodeId, filteredEdges)
        }
      }
    }

    return {
      nodes: subgraphNodes,
      adjacencyList: subgraphAdjacencyList,
    }
  })

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

  function setCurrentRouteGraph(graph: NavigationGraph) {
    console.log("Navigation Store", graph)
    currentRouteGraph.value = graph
  }

  function setNavigationGraph(graph: NavigationGraph) {
    navigationGraph.value = graph
  }

  function findPath(start: [number, number], targetPoiId: string): findPathResult {
    if (!navigationGraph.value) {
      throw new Error('Super graph is not loaded, cannot find path.')
    }

    const graph = navigationGraph.value // Use the main super graph
    const clonedGraph = cloneGraph(graph)
    console.log("Node", graph.nodes)
    console.log("Adjacency list", graph.adjacencyList)
    const userNodeId = addTemporaryNode(clonedGraph, start)
    const pathIds = findPathAStar(clonedGraph, userNodeId, targetPoiId)

    // Return the result for the component to use
    return {
      pathIds: pathIds,
      clonedGraph: clonedGraph,
    }
  }

  return {
    // State & Getters
    destinationID,
    navigationRoute,
    navigationGraph,
    currentRouteGraph,
    isNavigating,
    routeSubgraph,

    // Actions
    setDestination,
    clearNavigation,
    setNavigationRoute,
    setNavigationGraph,
    setCurrentRouteGraph,
    findPath,
  }
})
