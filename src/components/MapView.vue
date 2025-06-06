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
        @click="selectFloor(floor)"
      >
        F{{ floor }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default defineComponent({
  setup() {
    const mapContainer = ref<HTMLElement | null>(null)
    const map = ref<L.Map | null>(null)

    const floors = [1, 2, 3]
    const selectedFloor = ref(1)

    const selectFloor = (floor: number) => {
      selectedFloor.value = floor
      // Later: swap floor images here
    }

    onMounted(() => {
      map.value = L.map(mapContainer.value!).setView([51.505, -0.09], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map.value)
    })

    return {
      mapContainer,
      floors,
      selectedFloor,
      selectFloor,
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
