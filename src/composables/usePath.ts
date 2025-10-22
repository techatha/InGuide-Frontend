import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, LineString, Position } from 'geojson'
import pathService from '@/services/PathService'
import { type Ref } from 'vue'
import type { Map, PolylineOptions } from 'leaflet'
import L from 'leaflet'
import type { NavigationGraph } from '@/types/path'

export function usePath(map: Ref<Map>, pathLayer: L.LayerGroup) {
  async function renderFloorPaths(buildingId: string, floorId: string) {
    try {
      const graph = await pathService.loadPath(buildingId, floorId)
      renderPaths(graph)
    } catch (error) {
      console.log(error)
    }
  }

  async function renderPaths(graph: NavigationGraph) {
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
  }

  function renderRoute(pathIds: string[], graph: NavigationGraph) {
    clearWalkablePaths()

    const coords: [number, number][] = []
    for (const id of pathIds) {
      const node = graph.nodes.get(id)
      if (node) coords.push(node.coordinates)
    }

    if (coords.length > 1) {
      const polyline = L.polyline(coords, availablePath)
      polyline.addTo(pathLayer)
    }
  }

  function splitRouteAtPoint(fullRouteCoords: [number, number][], userPosition: Position): { traversed: [number, number][], upcoming: [number, number][] } {
    const userPoint = turf.point(switchLatLng(userPosition));
    let closestSegmentIndex = -1;
    let minDistance = Infinity;
    let snappedPointOnLine: [number, number] | undefined = undefined;

    // 1. Find the closest segment and the user's snapped point on the line
    for (let i = 0; i < fullRouteCoords.length - 1; i++) {
      const from = fullRouteCoords[i];
      const to = fullRouteCoords[i + 1];
      const line = turf.lineString([switchLatLng(from), switchLatLng(to)]);
      const snapped = turf.nearestPointOnLine(line, userPoint);
      const dist = snapped.properties.dist ?? Infinity;

      if (dist < minDistance) {
        minDistance = dist;
        closestSegmentIndex = i;
        snappedPointOnLine = switchLatLng(snapped.geometry.coordinates);
      }
    }

    if (closestSegmentIndex === -1 || !snappedPointOnLine) {
      return { traversed: [], upcoming: fullRouteCoords }; // Failsafe
    }

    // 2. Build the traversed and upcoming paths
    const traversed = fullRouteCoords.slice(0, closestSegmentIndex + 1);
    traversed.push(snappedPointOnLine); // End the traversed path at the user's exact spot

    const upcoming = [snappedPointOnLine]; // Start the upcoming path from the user's exact spot
    upcoming.push(...fullRouteCoords.slice(closestSegmentIndex + 1));

    return { traversed: traversed, upcoming: upcoming };
  }

  function renderRouteProgress(traversedCoords: [number, number][], upcomingCoords: [number, number][]) {
    clearWalkablePaths()

    // This is the logic to make the path disappear behind the user.
    // To make it turn gray instead, just uncomment the block below.
    /*
    if (traversedCoords.length > 1) {
      const traversedLine = L.polyline(traversedCoords, traversedPath);
      traversedLine.addTo(pathLayer);
    }
    */

    // Draw the orange, upcoming portion of the path
    if (upcomingCoords.length > 1) {
      const upcomingLine = L.polyline(upcomingCoords, availablePath)
      upcomingLine.addTo(pathLayer)
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
    renderFloorPaths,
    renderPaths,
    snapToPath,
    renderRoute,
    clearWalkablePaths,
    splitRouteAtPoint,
    renderRouteProgress,
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

// const traversedPath = {
//   color: 'gray',
//   weight: 5,
//   smoothFactor: 1,
// }
