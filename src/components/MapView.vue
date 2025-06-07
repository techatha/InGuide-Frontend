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
import mockMap from '../assets/MockMap.svg'
import * as gps from '../composables/useGeolocation'
import { watch } from 'vue'

export default defineComponent({
  setup() {
    // this is setup for test
    const centerLat = 18.755652251965408
    const centerLng = 99.03422248332312
    const delta = 0.0001 // ~11 meters

    const bounds = L.latLngBounds(
      [centerLat - delta, centerLng - 2 * delta], // Southwest corner
      [centerLat + delta, centerLng + 2 * delta], // Northeast corner
    )
    const mapContainer = ref<HTMLElement | null>(null)
    const map = ref<L.Map | null>(null)
    const blueDot = ref<L.CircleMarker | null>(null)

    const floors = [1, 2, 3]
    const selectedFloor = ref(1)

    const selectFloor = (floor: number) => {
      selectedFloor.value = floor
      // TODO: switch overlay if floor changes
    }

    onMounted(() => {
      map.value = L.map(mapContainer.value!, {
        zoomControl: false,
      })
      map.value.fitBounds(bounds)
      L.imageOverlay(mockMap, bounds).addTo(map.value)

      map.value.createPane('userPane')
      map.value.getPane('userPane').style.zIndex = 999

      gps.init()
      blueDot.value = L.circleMarker([centerLat, centerLng], {
        radius: 10, // Radius of the circle
        fillColor: '#278cea', // Fill color
        color: '#fffbf3', // Border color
        weight: 2, // Border width
        opacity: 1, // Border opacity
        fillOpacity: 1, // Fill opacity
        pane: 'userPane',
      }).addTo(map.value)
    })

    watch([gps.lat, gps.lng], ([newLat, newLng]) => {
      if (blueDot.value && newLat != null && newLng != null) {
        console.log("new lat/lng: " + [newLat, newLng])
        blueDot.value.setLatLng([newLat, newLng])
      }
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
