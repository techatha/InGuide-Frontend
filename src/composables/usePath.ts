import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, LineString, Position } from 'geojson'
import pathService from '@/services/PathService'
import { type Ref } from 'vue'
import type { Map, PolylineOptions } from 'leaflet'
import L from 'leaflet'

export function usePath(map: Ref<Map>, pathLayer: L.LayerGroup) {
  async function renderPaths(buildingId: string, floorId: string) {
    try {
      const graph = await pathService.loadPath(buildingId, floorId)
      clearWalkablePaths()
      graph.adjacencyList.forEach((edges, startNodeId) => {
        const startNode = graph.nodes.get(startNodeId)
        edges.forEach((edge) => {
          const endNode = graph.nodes.get(edge.targetNodeId)
          if (!endNode) return
          const path = [startNode?.coordinates, endNode?.coordinates] as [
            [number, number],
            [number, number],
          ]
          setWalkablePath(path, availablePath)
        })
      })
    } catch (error) {
      console.log(error)
    }
  }

  async function snapToPath(
    buildingId: string,
    floorId: string,
    userPos: Position,
  ): Promise<[number, number] | null> {
    const lineSegments = await buildLineStrings(buildingId, floorId)
    userPos = switchLatLng(userPos)

    // console.log("paths Service", lineSegments)

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
    const result = switchLatLng(closest)
    // console.log("cloest",result)
    return result
  }


  function setWalkablePath(latlng: [[number, number], [number, number]], style: PolylineOptions) {
    const newPath = L.polyline(latlng, style)
    newPath.addTo(pathLayer)
  }

  function clearWalkablePaths() {
    pathLayer.clearLayers()
  }

  return {
    renderPaths,
    snapToPath,
  }
}

async function buildLineStrings(buildingId: string, floorId: string) {
  const graph = await pathService.loadPath(buildingId, floorId)
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

function switchLatLng(pos: Position): [number, number] {
  return [pos[1], pos[0]]
}

const availablePath = {
  color: 'orange',
  weight: 5,
  smoothFactor: 1,
}
