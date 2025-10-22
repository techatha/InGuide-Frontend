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
import { ref, onMounted, watch, type Ref } from 'vue'
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
import { findPathAStar } from '@/utils/AStarPathFinding'
import { cloneGraph, addTemporaryNode } from '@/utils/AddTempNode'
import { convertToGraph } from '@/utils/covertToGraph'

const map = ref<L.Map | null>(null)
const poiLayer = L.layerGroup()
const pathLayer = L.layerGroup()

const mapDisplay = useMap(map as Ref)
const path = usePath(map as Ref, pathLayer)
const poi = usePOI(map as Ref, poiLayer)

const mapInfo = useMapInfoStore()
const beaconStore = useBeaconStore()
// this is setup for test
// CAMT Building location
const bounds = [
  [18.799062936888, 98.9503180904669], // South-West corner
  [18.79977192091592, 98.95093944127089], // North-East corner
]

const mapContainer = ref<HTMLElement | null>(null)

const changeFloorPlan = async (floor: Floor) => {
  const build_id = mapInfo.current_buildingId
  const newPOIs = await PoiService.getPOIs(build_id, floor.id)
  mapInfo.loadPOIs(newPOIs)
  const newBeacons = await beaconService.getBeacons(build_id, floor.id)
  beaconStore.loadBeacons(newBeacons)
  // path.renderFloorPaths(build_id, floor.id)
  mapInfo.current_floor = floor
  path.clearWalkablePaths()

  // reload new POIs
  const allPOIs = await PoiService.getAllPOIs(build_id)
  mapInfo.loadBuildingAllPois(allPOIs)
}

onMounted(async () => {
  const build_id = mapInfo.current_buildingId
  const floors: Floor[] = await buildingService.getFloors(build_id)
  mapInfo.loadFloors(floors)
  mapInfo.current_floor = floors[0]
  const POIs: POI[] = await PoiService.getPOIs(build_id, floors[0].id)
  mapInfo.loadPOIs(POIs)
  const newBeacons = await beaconService.getBeacons(build_id, floors[0].id)
  beaconStore.loadBeacons(newBeacons)
  await mapDisplay.init(mapContainer.value as HTMLElement, poiLayer, pathLayer)
  await mapDisplay.changeImageOverlay(mapInfo.current_floor.floor_plan_url)
  mapDisplay.setMapBound(bounds[0] as [number, number], bounds[1] as [number, number])
  mapDisplay.setView(bounds[0] as [number, number])

  mapInfo.setMapInitialized(true)
  // load all POIs as well
  const buildingPOIs = await PoiService.getAllPOIs(build_id)
  mapInfo.loadBuildingAllPois(buildingPOIs)
})

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

// Define Expose Functions
async function snapToPath(buildingId: string, floorId: string, position: [number, number]) {
  if (!position[0] || !position[1]) {
    console.warn('Skipping snapToPath because latlng is null')
    return
  }
  return await path.snapToPath(buildingId, floorId, position)
}
function setUserPosition(newLatLng: [number, number], headingRad: number) {
  if (!newLatLng[0] || !newLatLng[1]) {
    console.warn('Skipping setUserPosition because latlng is null')
    return
  }
  mapDisplay.setUserPosition(newLatLng, headingRad)
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
  console.log("route rendering start!", {"pathIds": pathIds, 'graph': graph})
  path.renderRoute(pathIds, graph)
}
function clearRenderedPath() {
  path.clearWalkablePaths()
}
function updateRouteProgressView(userPosition: [number, number]) {
  // 1. Get the currently displayed route from the Leaflet layer
  const layers = pathLayer.getLayers();
  if (layers.length === 0) {
    console.warn("updateRouteProgressView called, but no route is on the map.");
    return;
  }

  const routePolyline = layers[0] as L.Polyline;
  const fullRouteLatLngs = routePolyline.getLatLngs() as L.LatLng[];

  // Convert Leaflet's LatLng objects back to simple [lat, lng] arrays
  const fullRouteCoords: [number, number][] = fullRouteLatLngs.map(latlng => [latlng.lat, latlng.lng]);

  // 2. Ask the `path` composable to do the complex splitting logic
  const { traversed, upcoming } = path.splitRouteAtPoint(fullRouteCoords, userPosition);

  // 3. Tell the `path` composable to render the new split view
  path.renderRouteProgress(traversed, upcoming);
}

function renderPOIs(pois: POI[]) {
  poi.renderPOIs(pois)
}

type findPathResult = {
  pathIds: string[] | null,
  clonedGraph: NavigationGraph
}

function findPath(start: [number, number], targetPoiId: string): findPathResult {
  const JSONgraph: NavigationGraph = mapInfo.current_floor.graph as NavigationGraph
  if (!JSONgraph) throw new Error('Navigation graph not loaded')

  const graph = convertToGraph(JSONgraph.nodes, JSONgraph.adjacencyList)
  const clonedGraph = cloneGraph(graph)
  const userNodeId = addTemporaryNode(clonedGraph, start)

  // Run your existing A* (should accept NavigationGraph & node IDs)
  const pathIds = findPathAStar(clonedGraph, userNodeId, targetPoiId)
  // console.log(pathIds)
  return {
    pathIds: pathIds,
    clonedGraph: clonedGraph,
  }
}

function snapToRoute(subgraph: NavigationGraph, position: [number, number]): [number, number] {
  return path.snapToRoute(subgraph, position)
}

defineExpose({
  snapToPath,
  setUserPosition,
  setUserDebugPosition,
  renderPaths,
  renderRoute,
  renderPOIs,
  findPath,
  updateRouteProgressView,
  clearRenderedPath,
  snapToRoute,
})
</script>
