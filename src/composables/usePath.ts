// src/composables/usePath.ts

import * as turf from '@turf/turf'
import type { Feature, GeoJsonProperties, LineString, Position } from 'geojson'
import pathService from '@/services/PathService'
import { type Ref } from 'vue'
import type { PolylineOptions } from 'leaflet'
import L from 'leaflet'
import 'leaflet-geometryutil'
import type { NavigationGraph } from '@/types/path' // Import MapEdge

// --- Path Style Definitions ---

const availablePath: PolylineOptions = {
  color: 'orange',
  weight: 5,
  smoothFactor: 1,
}

// const traversedPath: PolylineOptions = {
//   color: 'gray',
//   weight: 5,
//   smoothFactor: 1,
// }

// --- Main Composable ---

export function usePath(map: Ref<L.Map>, pathLayer: L.LayerGroup) {

  /**
   * (Not currently used) Loads and renders all paths for a single floor.
   */
  async function renderFloorPaths(buildingId: string, floorId: string) {
    try {
      const graph = await pathService.loadPath(buildingId, floorId)
      renderPaths(graph)
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * Renders all edges of a given graph as polylines.
   */
  async function renderPaths(graph: NavigationGraph) {
    clearWalkablePaths()
    graph.adjacencyList.forEach((edges, startNodeId) => {
      const startNode = graph.nodes.get(startNodeId)
      edges.forEach((edge) => {
        const endNode = graph.nodes.get(edge.targetNodeId)
        if (!endNode || !startNode) return
        const path = [startNode.coordinates, endNode.coordinates] as [
          [number, number],
          [number, number],
        ]
        setWalkablePath(path, availablePath)
      })
    })
  }

  /**
   * Renders a single, continuous polyline from a list of node IDs.
   * Used to draw the main route on the map.
   */
  function renderRoute(pathIds: string[], graph: NavigationGraph) {
    clearWalkablePaths() // Clear any previous route

    const coords: [number, number][] = []
    for (const id of pathIds) {
      const node = graph.nodes.get(id)
      if (node) {
        coords.push(node.coordinates)
      } else {
        console.warn(`Node ID ${id} not found in graph during renderRoute.`)
      }
    }

    if (coords.length > 1) {
      const polyline = L.polyline(coords, availablePath)
      polyline.addTo(pathLayer)
    }
  }

  /**
   * Splits a route polyline into two parts (traversed, upcoming) based on the user's position.
   */
  function splitRouteAtPoint(
    fullRouteCoords: [number, number][],
    userPosition: [number, number]
  ): { traversed: [number, number][]; upcoming: [number, number][] } {

    // Turf.js uses [lon, lat], while Leaflet uses [lat, lng].
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
      const dist = snapped.properties.dist ?? Infinity; // Distance along the line

      if (dist < minDistance) {
        minDistance = dist;
        closestSegmentIndex = i;
        // Convert snapped point back to [lat, lng] for Leaflet
        snappedPointOnLine = switchLatLng(snapped.geometry.coordinates as Position);
      }
    }

    if (closestSegmentIndex === -1 || !snappedPointOnLine) {
      return { traversed: [], upcoming: fullRouteCoords }; // Failsafe
    }

    // 2. Build the traversed and upcoming paths
    // Path from start up to the start of the closest segment
    const traversed = fullRouteCoords.slice(0, closestSegmentIndex + 1);
    traversed.push(snappedPointOnLine); // End the traversed path at the user's exact spot

    // Path from the user's exact spot to the end
    const upcoming = [snappedPointOnLine]; // Start the upcoming path
    upcoming.push(...fullRouteCoords.slice(closestSegmentIndex + 1));

    return { traversed: traversed, upcoming: upcoming };
  }

  /**
   * Renders the split route (traversed and upcoming sections).
   * Currently only renders the upcoming (orange) path.
   */
  function renderRouteProgress(traversedCoords: [number, number][], upcomingCoords: [number, number][]) {
    clearWalkablePaths()

    // This is the logic to make the path disappear behind the user.
    // To make it turn gray instead, uncomment the block below and define 'traversedPath'.
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

  /**
   * Snaps the user's position to the *nearest* walkable path on the floor.
   * (Used in browsing mode).
   */
  async function snapToPath(
    buildingId: string,
    floorId: string,
    userPos: [number, number], // Leaflet's [lat, lng]
  ): Promise<[number, number] | null> {

    // Build line strings for the current floor
    const lineSegments = await buildLineStrings(buildingId, floorId)
    if (lineSegments.length === 0) {
        console.warn(`No path segments found for floor ${floorId} to snap to.`);
        return userPos; // Return original position if no paths
    }

    // Convert user's [lat, lng] to Turf's [lon, lat]
    const userPoint = switchLatLng(userPos)

    let closest: [number, number] | null = null
    let minDistance = Infinity

    for (const segment of lineSegments) {
      const snapped = turf.nearestPointOnLine(segment, userPoint, { units: 'meters' })
      const dist = snapped.properties?.dist ?? Infinity

      if (dist < minDistance) {
        minDistance = dist
        closest = snapped.geometry.coordinates as [number, number] // [lon, lat]
      }
    }

    if (closest === null) {
      return null
    }

    // Convert the snapped point back to [lat, lng] for Leaflet
    const result = switchLatLng(closest)
    return result
  }

  /**
   * Finds the closest point on the active navigation route (subgraph)
   * to a given position, *only considering segments on the user's current floor*.
   */
  function snapToRoute(
    subgraph: NavigationGraph,
    position: [number, number], // User's [lat, lng]
    currentUserFloor: number | null,
    nodeToFloorMap: Map<string, number>
  ): [number, number] {

    if (!map.value) {
      console.warn('Map not initialized, cannot snap to route.')
      return position
    }
    if (!subgraph.nodes || !subgraph.adjacencyList || subgraph.nodes.size === 0) {
      console.warn('Subgraph is empty, cannot snap to route.')
      return position
    }
    if (currentUserFloor === null || currentUserFloor === undefined) {
        console.warn('Current user floor is unknown, cannot snap to route.');
        return position;
    }

    const userLatLng = L.latLng(position[0], position[1]) // Leaflet's L.LatLng
    let minDistance = Infinity
    let snappedLatLng: [number, number] = [999, 999] // Invalid default
    let foundSnap = false; // Flag to see if we found any valid segment

    const processedEdges = new Set<string>()

    for (const [nodeId, edges] of subgraph.adjacencyList.entries()) {
      const startNode = subgraph.nodes.get(nodeId)
      if (!startNode) continue

      // --- Floor Check ---
      // Check if the start node of the segment is on the user's current floor.
      const segmentFloor = nodeToFloorMap.get(nodeId);
      if (segmentFloor !== currentUserFloor) {
          continue; // Skip this edge, it's on a different floor
      }
      // --- End Floor Check ---

      const startLatLng = L.latLng(startNode.coordinates[0], startNode.coordinates[1])

      for (const edge of edges) {
        const neighborId = edge.targetNodeId
        if (!neighborId) continue;
        const endNode = subgraph.nodes.get(neighborId)
        if (!endNode) continue

        // Skip virtual portal segments
        if (startNode?.portalGroup && endNode?.portalGroup && startNode.portalGroup === endNode.portalGroup) {
           continue;
        }

        const edgeKey1 = `${nodeId}-${neighborId}`
        const edgeKey2 = `${neighborId}-${nodeId}`
        if (processedEdges.has(edgeKey1) || processedEdges.has(edgeKey2)) {
          continue
        }
        processedEdges.add(edgeKey1)

        const endLatLng = L.latLng(endNode.coordinates[0], endNode.coordinates[1])
        const closestPointOnSegment = L.GeometryUtil.closestOnSegment(
          map.value,
          userLatLng,
          startLatLng,
          endLatLng
        )

        if (closestPointOnSegment) {
          const distance = userLatLng.distanceTo([closestPointOnSegment.lat, closestPointOnSegment.lng])
          if (distance < minDistance) {
            minDistance = distance
            snappedLatLng = [closestPointOnSegment.lat, closestPointOnSegment.lng]
            foundSnap = true;
          }
        }
      }
    }

    // If we never found a valid segment on this floor, return the original position
    if (!foundSnap) {
        return position;
    }

    return snappedLatLng
  }

  /**
   * Adds a single polyline (a path segment) to the path layer.
   */
  function setWalkablePath(latlng: [[number, number], [number, number]], style: PolylineOptions) {
    const newPath = L.polyline(latlng, style)
    newPath.addTo(pathLayer)
  }

  /**
   * Clears all polylines from the path layer.
   */
  function clearWalkablePaths() {
    pathLayer.clearLayers()
  }

  // Expose functions to be used in components
  return {
    renderFloorPaths,
    renderPaths,
    snapToPath,
    snapToRoute,
    renderRoute,
    clearWalkablePaths,
    splitRouteAtPoint,
    renderRouteProgress,
  }
}

// --- Helper Functions (File-level) ---

/**
 * Loads a floor's graph and builds an array of Turf.js LineString features.
 */
async function buildLineStrings(buildingId: string, floorId: string) {
  let graph: NavigationGraph;
  try {
     graph = await pathService.loadPath(buildingId, floorId)
  } catch (error) {
     console.error("Failed to load path for buildLineStrings", error);
     return []; // Return empty array on failure
  }

  const segments: Feature<LineString, GeoJsonProperties>[] = []
  const seen = new Set<string>()

  graph.adjacencyList.forEach((edges, fromId) => {
    const fromNode = graph.nodes.get(fromId)
    if (!fromNode) return

    for (const edge of edges) {
      const toNode = graph.nodes.get(edge.targetNodeId)
      if (!toNode) continue

      // Ensure we only process each edge once
      const edgeKey = [fromId, edge.targetNodeId].sort().join('-')
      if (seen.has(edgeKey)) continue
      seen.add(edgeKey)

      // Skip virtual portal segments
      if(fromNode.portalGroup && toNode.portalGroup && fromNode.portalGroup === toNode.portalGroup) {
        continue;
      }

      const line = turf.lineString([
        switchLatLng(fromNode.coordinates), // Convert to [lon, lat]
        switchLatLng(toNode.coordinates),  // Convert to [lon, lat]
      ])
      segments.push(line)
    }
  })

  return segments
}

/**
 * Switches a [lat, lng] array to [lon, lat] for Turf.js, or vice versa.
 */
function switchLatLng(pos: Position): [number, number] {
  return [pos[1], pos[0]]
}
