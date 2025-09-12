<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <SearchBar />
  <MenuPanel>
    <div v-show="uiStore.isSearchFocused">
      <SearchResultsView />
    </div>
    <div v-show="!uiStore.isSearchFocused">
      <RouterView />
    </div>
  </MenuPanel>
  <PopUpWindow name="popup" v-model:visible="showPopup">
    <h2 class="text-xl font-bold mb-2">Welcome to InGuide!</h2>
    <p class="mb-4">🙏 Please enable Sensor API.</p>
    <button @click="initPosition" class="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg">
      Enable sensor API
    </button>
  </PopUpWindow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePositioningSystem } from '@/composables/usePositioningSystem'
import { useMapInfoStore } from '@/stores/mapInfo'
import { useBeaconStore } from '@/stores/beacon'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
// vue component
import SearchBar from '@/components/SearchBar.vue'
import PopUpWindow from '@/components/PopUpWindow.vue'
import MenuPanel from '@/components/MenuPanel.vue'
import SearchResultsView from './panelViews/SearchResultsView.vue'
import { findNearestBeacon } from '@/utils/findNearestBeacon'
import type { Beacon } from '@/types/beacon'

const showPopup = ref(false)
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()
const beaconStore = useBeaconStore()

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapDisplayRef: any
}>()
const position = usePositioningSystem()

const initPosition = () => {
  position.init()
  setInterval(async () => {
    // console.log("predicted: ", position.getPredictionResult())
    // console.log("read position: ", position.getPosition())
    const userPos = position.getPosition()
    console.log("user's pos:", userPos)
    const snappedPos = await props.mapDisplayRef.snapToPath(mapInfo.current_buildingId, mapInfo.current_floor.id, userPos)
    const heading = position.getRadHeading()
    const nearestBeacon = findNearestBeacon(userPos[0], userPos[1], beaconStore.beacons as Beacon[])
    if(nearestBeacon && nearestBeacon?.distance < .01)
      position.deadRecon.value?.resetToBeacon(nearestBeacon?.beacon as Beacon)
    // console.log("snapped: ", snappedPos)
    props.mapDisplayRef.setUserPosition(snappedPos as [number, number], heading)
    props.mapDisplayRef.setUserDebugPosition(userPos)
  }, 1000)
  setInterval(() => {
    // console.log(position.getPredictionResult());
  }, 2000)
  showPopup.value = false
}

watch(
  () => mapInfo.isMapInitialized,
  (isInitialized) => {
    if (isInitialized) {
      console.log('Map is ready, rendering paths and POIs!')
      props.mapDisplayRef.renderPaths(mapInfo.current_buildingId, mapInfo.current_floor.id)

      const POIs = mapInfo.POIs
      props.mapDisplayRef.renderPOIs(POIs)

      setTimeout(() => {
        showPopup.value = true
      }, 1000)
    }
  },
  { immediate: true },
)

watch(
  () => uiStore.isSearchFocused,
  () => {
    uiStore.fullExpand()
  },
)
</script>

<style src="@/style/MapView.css"></style>
