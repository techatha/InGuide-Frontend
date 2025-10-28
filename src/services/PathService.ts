import type { MapNode, MapEdge, JSONNavigationGraph, NavigationGraph } from '@/types/path'
import axios from 'axios'


const httpClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function loadPath(buildingId: string, floorId: string): Promise<NavigationGraph> {
  try {
    const response = await httpClient.get(`/paths/${buildingId}/${floorId}`)
    const pathData: JSONNavigationGraph = response.data

    // Use a Map for efficient lookups when building the graph
    const nodesMap = new Map<string, MapNode>()
    pathData.nodes.forEach((node) => {
      nodesMap.set(node.id, node)
    })

    // Rebuild the adjacency list using Map
    const adjacencyListMap = new Map<string, MapEdge[]>()
    for (const sourceId in pathData.adjacencyList) {
      if (pathData.adjacencyList.hasOwnProperty(sourceId)) {
        adjacencyListMap.set(sourceId, pathData.adjacencyList[sourceId])
      }
    }

    // Now, return the object that matches the NavigationGraph interface
    return {
      nodes: nodesMap,
      adjacencyList: adjacencyListMap,
    }
  } catch (err) {
    console.error('Error loading path data:', err)
    throw err
  }
}

export default {
  loadPath,
}

