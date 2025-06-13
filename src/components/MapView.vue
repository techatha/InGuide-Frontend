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
import * as position from '@/composables/usePositioningSystem'

export default defineComponent({
  setup() {
    // this is setup for test
    const centerLat = 18.755652251965408
    const centerLng = 99.03422248332312
    const delta = 0.0001 // ~11 meters
    const bounds = [
      [centerLat - delta, centerLng - 2 * delta], // Southwest corner
      [centerLat + delta, centerLng + 2 * delta], // Northeast corner
    ]

    const mapContainer = ref<HTMLElement | null>(null)
    const floors = [1, 2, 3]
    const selectedFloor = ref(1)

    const selectFloor = (floor: number) => {
      selectedFloor.value = floor
      // TODO: switch overlay if floor changes
    }
    onMounted(() => {
      map.init(mapContainer.value as HTMLElement)
      map.setMapBound(bounds[0] as [number, number], bounds[1] as [number, number])
      map.setWalkablePath()
    })

    const initPosition = () => {
      position.init()
      setInterval(() => {
        map.setUserPosition(position.getPosition())
      }, 1000)
      setInterval(() => {
        console.log(position.getPrediction());
      }, 500)
    }

    return {
      mapContainer,
      floors,
      selectedFloor,
      selectFloor,
      initPosition
    }
  },
})
</script>

<style scoped>
.map-view {
  background-color: #fff3a0;
  height: 100%;
}

#map {
  z-index: 0;
  height: calc(100%);
  background-color: #fff3a0;
}

.floor-list {
  z-index: 10;
  background-color: gainsboro;
  border-radius: 5px;
  position: absolute;
  bottom: 20vh;
  left: 20px;
  display: flex;
  flex-direction: column-reverse;
  gap: 5px;
}

.floor {
  padding: 15px 20px;
  border-radius: 5px;
}
.floor.selected {
  background-color: #add8e6;
}
</style>
