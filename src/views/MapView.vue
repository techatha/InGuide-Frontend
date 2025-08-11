<template>
  <div class="map-view">
    <!-- Placeholder for Leaflet -->
    <div id="map" ref="mapContainer"></div>

    <div class="floor-list">
      <div
        v-for="floor in floors"
        :key="floor"
        class="floor"
        :class="{ selected: floor === selectedFloor }"
        @click="initPosition()"
      >
        F{{ floor }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'
import * as map from '@/composables/useMap'
import * as path from '@/composables/usePath'
import * as position from '@/composables/usePositioningSystem'

export default defineComponent({
  setup() {
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
    const floors = [1, 2, 3]
    const selectedFloor = ref(3)

    const selectFloor = (floor: number) => {
      selectedFloor.value = floor
      // TODO: switch overlay if floor changes
    }
    onMounted(() => {
      map.init(mapContainer.value as HTMLElement)
      map.setMapBound(bounds[0] as [number, number], bounds[1] as [number, number])
      path.renderPaths()
      map.setView(bounds[0] as [number, number])
    })


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
    }

    return {
      mapContainer,
      floors,
      selectedFloor,
      selectFloor,
      initPosition,
    }
  },
})
</script>

<style src="../style/MapView.css"></style>
