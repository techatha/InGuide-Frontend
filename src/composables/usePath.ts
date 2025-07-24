import * as pathService from '@/services/mocks/PathService'
import * as map from '@/composables/useMap'

const availablePath = {
  color: 'orange',
  weight: 5,
  smoothFactor: 1,
}

export async function renderPaths() {
  try {
    const graph = await pathService.getPaths()
    graph.adjacencyList.forEach((edges, startNodeId) => {
      const startNode = graph.nodes.get(startNodeId)
      edges.forEach((edge) => {
        const endNode = graph.nodes.get(edge.targetNodeId)
        if (!endNode) return
        const path  = [startNode?.coordinates, endNode?.coordinates] as [[number, number], [number, number]]
        map.setWalkablePath(path, availablePath)
      })
    })
  } catch (error) {
    console.log(error)
  }
}
