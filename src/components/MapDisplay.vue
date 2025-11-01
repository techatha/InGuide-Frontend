<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <div class="map-view">
    <!-- Placeholder for Leaflet -->
    <div id="map" ref="mapContainer"></div>

    <div class="floor-list">
      <div
        v-for="floor in mapInfo.floors"
        :key="floor.floor"
        class="floor"
        :class="{ selected: floor.floor === mapInfo.current_floor.floor }"
        @click="changeFloorPlan(floor)"
      >
        F{{ floor.floor }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, type Ref, computed } from 'vue'
import 'leaflet/dist/leaflet.css'
import buildingService from '@/services/buildingService'
import PoiService from '@/services/PoiService'
import beaconService from '@/services/beaconService'
import { useMapInfoStore } from '@/stores/mapInfo'
import { useBeaconStore } from '@/stores/beacon'
import { useMap } from '@/composables/useMap'
import type { Floor } from '@/types/floor'
import type { POI } from '@/types/poi'
import { usePOI } from '@/composables/usePOI'
import L from 'leaflet'
import { usePath } from '@/composables/usePath'
import type { NavigationGraph } from '@/types/path'
import { useNavigationStore } from '@/stores/navigation'
import NavGraphService from '@/services/NavGraphService'

const map = ref<L.Map | null>(null)
const poiLayer = L.layerGroup()
const pathLayer = L.layerGroup()

const mapDisplay = useMap(map as Ref)
const path = usePath(map as Ref, pathLayer)
const poi = usePOI(map as Ref, poiLayer)

const mapInfo = useMapInfoStore()
const beaconStore = useBeaconStore()
const navigationStore = useNavigationStore()

// this is setup for test
// CAMT Building location
// const bounds = [
//   [18.799062936888, 98.9503180904669], // South-West corner
//   [18.79977192091592, 98.95093944127089], // North-East corner
// ]

const mapContainer = ref<HTMLElement | null>(null)

const changeFloorPlan = async (floor: Floor) => {
  const build_id = mapInfo.current_buildingId
  if(!build_id){
    console.log("No building ID store on Pinia")
    return
  }
  mapInfo.current_floor = floor
  path.clearWalkablePaths()
  poi.removePOIs()
  const newPOIs = await PoiService.getPOIs(build_id, floor.id)
  mapInfo.loadPOIs(newPOIs)
  // path.renderFloorPaths(build_id, floor.id)
  // reload new POIs
  const allPOIs = await PoiService.getAllPOIs(build_id)
  mapInfo.loadBuildingAllPois(allPOIs)

  console.log(
    'Graph for Floor',
    floor.floor,
    ':',
    floor.graph,
    'compute :',
    currentFloorRouteSegment,
  )
}

const currentFloorRouteSegment = computed(() => {
  const fullRoute = navigationStore.navigationRoute
  const currentFloorGraph = mapInfo.current_floor?.graph
  const currentRouteGraph = navigationStore.currentRouteGraph

  // Basic checks
  if (
    !navigationStore.isNavigating ||
    !currentFloorGraph?.nodes ||
    !currentRouteGraph?.nodes ||
    fullRoute.length === 0
  ) {
    return []
  }

  const realNodesOnFloor = fullRoute.filter((nodeId) => currentFloorGraph.nodes.has(nodeId))
  if (realNodesOnFloor.length === 0) {
    return []
  }
  let tempNodeId: string | null = null
  for (const nodeId of currentRouteGraph.nodes.keys()) {
    if (nodeId.startsWith('temp_')) {
      tempNodeId = nodeId
      break // Found it, stop searching
    }
  }

  if (tempNodeId && fullRoute.length > 1 && realNodesOnFloor[0] === fullRoute[1]) {
    // Prepend the temporary node ID
    return [tempNodeId, ...realNodesOnFloor]
  } else {
    // Just return the real nodes
    return realNodesOnFloor
  }
})

async function loadMapData(build_id: string) {
  try {
    console.log(`Loading all map data for building ID: ${build_id}`)

    // --- Start fetching data in parallel ---
    // 1. ADD a promise to get the building's own info (including bounds)
    const buildingPromise = buildingService.getBuilding(build_id)

    const floorsPromise = buildingService.getFloors(build_id)
    const beaconsPromise = beaconService.getAllBeacons(build_id)
    const superGraphPromise = NavGraphService.getSuperGraph(build_id)
    const allPOIsPromise = PoiService.getAllPOIs(build_id)

    // --- Wait for the building info first ---
    // We need its bounds to set the map's view
    const building = await buildingPromise
    if (!building || !building.NE_bound || !building.SW_bound) { // Assuming bounds are stored on the building object
      console.error('Building data or bounds are missing!')
      return
    }

    // 2. NOW set the map bounds and view using the loaded data
    mapDisplay.setMapBound(building.SW_bound, building.NE_bound)

    // --- Wait for Floors (since we need it for the first floor POIs) ---
    const floors: Floor[] = await floorsPromise
    if (!floors || floors.length === 0) {
      console.error('No floors found for this building.')
      return // Stop if no floors
    }
    mapInfo.loadFloors(floors)
    const firstFloor = floors[0]
    mapInfo.current_floor = firstFloor

    // --- Fetch first floor POIs (depends on floors) ---
    const firstFloorPOIsPromise = PoiService.getPOIs(build_id, firstFloor.id)

    // --- Wait for ALL remaining promises to finish ---
    const [
      POIs,
      newBeacons,
      superGraph,
      buildingPOIs
    ] = await Promise.all([
      firstFloorPOIsPromise,
      beaconsPromise,
      superGraphPromise,
      allPOIsPromise
    ])

    // --- Load all data into stores ---
    mapInfo.loadPOIs(POIs)
    beaconStore.loadAllBeacons(newBeacons)
    navigationStore.setNavigationGraph(superGraph)
    mapInfo.loadBuildingAllPois(buildingPOIs)

    console.log('Super graph and all data loaded.')

    // --- Update map display with the first floor image ---
    await mapDisplay.changeImageOverlay(mapInfo.current_floor.floor_plan_url)

    // Set initialized to true ONLY after everything has succeeded
    mapInfo.setMapInitialized(true)
    console.log('Map data initialization complete.')

  } catch (error) {
    console.error('Failed to initialize map or load essential data:', error)
  }
}

// Define Expose Functions
async function snapToPath(buildingId: string, floorId: string, position: [number, number]) {
  if (!position[0] || !position[1]) {
    console.warn('Skipping snapToPath because latlng is null')
    return
  }
  return await path.snapToPath(buildingId, floorId, position)
}
function setUserPosition(
  newLatLng: [number, number],
  headingRad: number,
  currentUserFloor: number | null
) {
  if (!newLatLng[0] || !newLatLng[1]) {
    console.warn('Skipping setUserPosition because latlng is null')
    return
  }
  mapDisplay.setUserPosition(newLatLng, headingRad)

  const mapFloor = mapInfo.current_floor?.floor
  // console.log(currentUserFloor !== null, mapFloor !== undefined, currentUserFloor === mapFloor)

  // Compare user's actual floor with the map's displayed floor
  if (currentUserFloor !== null && mapFloor !== undefined && currentUserFloor === mapFloor) {
    // Floors match: Call the internal useMap function to show/update
    // console.log("SHOW yoURSelF~~")
    mapDisplay.setUserPosition(newLatLng, headingRad)
  } else {
    // Floors don't match (or user floor unknown): Call the internal useMap function to hide
    // console.log("HIDDE")
    mapDisplay.hideUserPosition()
  }
}
function setViewToUser() {
  mapDisplay.setViewToUser()
}
function hideUserPosition() {
  mapDisplay.hideUserPosition()
}
function setUserDebugPosition(newLatLng: [number, number]) {
  if (!newLatLng[0] || !newLatLng[1]) {
    console.warn('Skipping setUserDebugPosition because latlng is null')
    return
  }
  mapDisplay.setUserDebugPosition(newLatLng)
}
function renderPaths(graph: NavigationGraph) {
  path.renderPaths(graph)
}
function renderRoute(pathIds: string[], graph: NavigationGraph) {
  console.log('route rendering start!', { pathIds: pathIds, graph: graph })
  path.renderRoute(pathIds, graph)
}
function clearRenderedPath() {
  path.clearWalkablePaths()
}
function updateRouteProgressView(userPosition: [number, number], currentUserFloor: number | null) {
  const mapFloor = mapInfo.current_floor?.floor
  if (currentUserFloor === null || mapFloor === undefined || currentUserFloor !== mapFloor) {
    // If user's floor is unknown, map floor is unknown, or they don't match,
    // DO NOT update the progress view for this floor.
    // Keep the existing full segment drawn by renderRoute.
    // console.log(`Skipping updateRouteProgressView: User floor (${currentUserFloor}) != Map floor (${mapFloor})`);
    return
  }
  // 1. Get the currently displayed route from the Leaflet layer
  const layers = pathLayer.getLayers()
  if (layers.length === 0) {
    console.warn('updateRouteProgressView called, but no route is on the map.')
    return
  }

  const routePolyline = layers[0] as L.Polyline
  const fullRouteLatLngs = routePolyline.getLatLngs() as L.LatLng[]

  // Convert Leaflet's LatLng objects back to simple [lat, lng] arrays
  const fullRouteCoords: [number, number][] = fullRouteLatLngs.map((latlng) => [
    latlng.lat,
    latlng.lng,
  ])

  // 2. Ask the `path` composable to do the complex splitting logic
  const { traversed, upcoming } = path.splitRouteAtPoint(fullRouteCoords, userPosition)

  // 3. Tell the `path` composable to render the new split view
  path.renderRouteProgress(traversed, upcoming)
}

function renderPOIs(pois: POI[]) {
  poi.renderPOIs(pois)
}

function snapToRoute(subgraph: NavigationGraph, position: [number, number], userFloor = 1, nodeToFloorMap: Map<string, number>): [number, number] {
  const snappdePos = path.snapToRoute(subgraph, position, userFloor, nodeToFloorMap)
  console.log(snappdePos)
  return snappdePos
}

// --- 6. ADD watch to render the filtered route ---
watch(
  () => mapInfo.floorPOIs,
  (pois) => {
    poi.removePOIs()
    poi.renderPOIs(pois)
  },
)
watch(
  () => mapInfo.current_floor,
  () => {
    mapDisplay.changeImageOverlay(mapInfo.current_floor.floor_plan_url)
  },
)
watch(
  // Watch both the segment AND the graph it depends on
  [() => currentFloorRouteSegment.value, () => navigationStore.currentRouteGraph],
  ([pathSegment, routeGraph]) => {
    clearRenderedPath() // Clear old path
    console.log(pathSegment)

    // Only render if we have a segment AND the full route graph
    if (pathSegment && pathSegment.length > 0 && routeGraph) {
      renderRoute(pathSegment, routeGraph)
    }
  },
  { immediate: true }, // Run once on load
)
watch(
  () => mapInfo.current_buildingId,
  (newBuildId) => {
    if (newBuildId) {
      // We have a valid ID, so load all the data
      loadMapData(newBuildId)
    } else {
      // The ID was cleared (e.g., user logged out or went to home page)
      console.log('Building ID is null. Clearing map data.')
      // You can add logic here to clear the map, hide layers, etc.
      mapInfo.setMapInitialized(false)
      // mapDisplay.clearAllLayers() // You'd need to add this function to useMap
    }
  },
  { immediate: true } // This makes it run once when the component mounts
)

onMounted(async () => {
  try {
    // ONLY initialize the map display.
    await mapDisplay.init(mapContainer.value as HTMLElement, poiLayer, pathLayer)
    console.log('Map container initialized.')
  } catch (error) {
    console.error('Failed to initialize map container:', error)
  }
})

defineExpose({
  snapToPath,
  setUserPosition,
  setViewToUser,
  hideUserPosition,
  setUserDebugPosition,
  renderPaths,
  renderRoute,
  renderPOIs,
  updateRouteProgressView,
  clearRenderedPath,
  snapToRoute,
})
</script>
