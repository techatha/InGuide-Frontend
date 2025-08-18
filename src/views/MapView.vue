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
  <PopUpWindow name="popup" v-model:visible="showPopup">
    <h2 class="text-xl font-bold mb-2">Welcome to InGuide!</h2>
    <p class="mb-4">🙏 Please enable Sensor API.</p>
    <button @click="initPosition" class="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg">
      Enable sensor API
    </button>
  </PopUpWindow>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import { getFloors } from '@/services/BuildingService'
import { useMapInfoStore } from '@/stores/mapInfo'
import * as map from '@/composables/useMap'
import * as path from '@/composables/usePath'
import * as position from '@/composables/usePositioningSystem'
import * as poi from '@/composables/usePOI'
import type { Floor } from '@/types/floor'
// vue component
import PopUpWindow from '@/components/PopUpWindow.vue'
const showPopup = ref(false)

const mapInfo = useMapInfoStore()
// this is setup for test
// CAMT Building location
const bounds = [
  [18.799062936888, 98.9503180904669], // South-West corner
  [18.79977192091592, 98.95093944127089], // North-East corner
]

//
// const centerLat = 18.755652251965408
// const centerLng = 99.03422248332312
// const delta = 0.0001 // ~11 meters
// const bounds = [
//   [centerLat - delta, centerLng - 2 * delta], // Southwest corner
//   [centerLat + delta, centerLng + 2 * delta], // Northeast corner
// ]

const mapContainer = ref<HTMLElement | null>(null)

const initPosition = () => {
  position.init()
  setInterval(async () => {
    // console.log("predicted: ", position.getPredictionResult())
    // console.log("read position: ", position.getPosition())
    const userPos = position.getPosition()
    const snappedPos = await path.snapToPath(userPos)
    const heading = position.getRadHeading()
    // console.log("snapped: ", snappedPos)
    map.setUserPosition(snappedPos as [number, number], heading)
    map.setUserDebugPosition(userPos)
  }, 1000)
  setInterval(() => {
    // console.log(position.getPredictionResult());
  }, 2000)
  showPopup.value = false;
}

const changeFloorPlan = (floor: Floor) => {
  map.changeFloorPlan(floor.floor_plan_url)
  mapInfo.current_floor = floor
}

onMounted(async () => {
  const floors = await getFloors(mapInfo.current_buildingId)
  mapInfo.current_floor = floors[0]
  console.log('nab nab')
  await map.init(mapContainer.value as HTMLElement)
  await map.changeFloorPlan(mapInfo.current_floor.floor_plan_url)
  map.setMapBound(bounds[0] as [number, number], bounds[1] as [number, number])
  path.renderPaths()
  poi.renderAllPOI()
  map.setView(bounds[0] as [number, number])
  setTimeout(() => {
    showPopup.value = true
  }, 1000)
})
</script>

<style src="../style/MapView.css"></style>
