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
import { ref, onMounted, watch } from 'vue'
import 'leaflet/dist/leaflet.css'
import { getFloors } from '@/services/BuildingService'
import PoiService from '@/services/PoiService'
import { useMapInfoStore } from '@/stores/mapInfo'
import * as map from '@/composables/useMap'
import type { Floor } from '@/types/floor'
import type { POI } from '@/types/poi'
import * as poi from '@/composables/usePOI'
// vue component

const mapInfo = useMapInfoStore()
// this is setup for test
// CAMT Building location
const bounds = [
  [18.799062936888, 98.9503180904669], // South-West corner
  [18.79977192091592, 98.95093944127089], // North-East corner
]

const mapContainer = ref<HTMLElement | null>(null)

const changeFloorPlan = async (floor: Floor) => {
  const build_id = mapInfo.current_buildingId
  const newPOIs = await PoiService.getPOIs(build_id, floor.floor)
  
  mapInfo.loadPOIs(newPOIs)
  mapInfo.current_floor = floor
}

onMounted(async () => {
  const build_id = mapInfo.current_buildingId
  const floors: Floor[] = await getFloors(build_id)
  mapInfo.loadFloors(floors)
  mapInfo.current_floor = floors[0]
  const POIs: POI[] = await PoiService.getPOIs(build_id, floors[0].floor)
  mapInfo.loadPOIs(POIs)
  await map.init(mapContainer.value as HTMLElement)
  await map.changeFloorPlan(mapInfo.current_floor.floor_plan_url)
  map.setMapBound(bounds[0] as [number, number], bounds[1] as [number, number])
  map.setView(bounds[0] as [number, number])

  mapInfo.setMapInitialized(true)
})

watch(() => mapInfo.POIs, (pois) =>{
  poi.removePOIs()
  poi.renderPOIs(pois)
})
</script>


