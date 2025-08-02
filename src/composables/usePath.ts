import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, LineString, Position } from 'geojson'
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
        const path = [startNode?.coordinates, endNode?.coordinates] as [
          [number, number],
          [number, number],
        ]
        map.setWalkablePath(path, availablePath)
      })
    })
  } catch (error) {
    console.log(error)
  }
}

export async function snapToPath(userPos: Position): Promise<[number, number] | null> {
  const lineSegments = await buildLineStrings()
  userPos = switchLatLng(userPos)

  console.log(lineSegments)

  let closest: [number, number] | null = null
  let minDistance = Infinity

  for (const segment of lineSegments) {
    const snapped = turf.nearestPointOnLine(segment, userPos, { units: 'meters' })
    const dist = snapped.properties?.dist ?? Infinity

    if (dist < minDistance) {
      minDistance = dist
      closest = snapped.geometry.coordinates as [number, number]
    }
  }

  if (closest === null) {
    return null
  }
  return switchLatLng(closest) as [number, number]
}

async function buildLineStrings() {
  const graph = await pathService.getPaths()
  const segments: Feature<LineString, GeoJsonProperties>[] = []
  const seen = new Set<string>()

  graph.adjacencyList.forEach((edges, fromId) => {
    const fromNode = graph.nodes.get(fromId)
    if (!fromNode) return

    for (const edge of edges) {
      const toNode = graph.nodes.get(edge.targetNodeId)
      if (!toNode) continue

      const edgeKey = [fromId, edge.targetNodeId].sort().join('-')
      if (seen.has(edgeKey)) continue

      seen.add(edgeKey)
      const line = turf.lineString([
        switchLatLng(fromNode.coordinates),
        switchLatLng(toNode.coordinates),
      ])
      segments.push(line)
    }
  })

  return segments
}

function switchLatLng(pos: Position): Position {
  return [pos[1], pos[0]]
}
