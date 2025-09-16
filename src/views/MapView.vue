<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <SearchBar />
  <MenuPanel>
    <div v-show="uiStore.isSearchFocused">
      <SearchResultsView />
    </div>
    <div v-show="!uiStore.isSearchFocused">
      <RouterView @navigate-to="generateRoute"/>
    </div>
  </MenuPanel>
  <PopUpWindow name="popup" v-model:visible="showPopup">
    <h2 class="text-xl font-bold mb-2">Welcome to InGuide!</h2>
    <p class="mb-4">🙏 Please enable Sensor API.</p>
    <button @click="requestPermissions" class="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg">
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
const isPermissionGranted = ref(false)
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()
const beaconStore = useBeaconStore()

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapDisplayRef: any
}>()
const position = usePositioningSystem()

const initPosition = async () => {
  const initBeacon = localStorage.getItem('beaconID')
  const latLng = beaconStore.findBeaconById(initBeacon ?? '').latLng
  const snappedLatLng = await props.mapDisplayRef.snapToPath(
    mapInfo.current_buildingId,
    mapInfo.current_floor.id,
    latLng,
  )
  position.init(snappedLatLng)

  setInterval(async () => {
    // console.log("UI Updated")
    const userPos = position.getPosition()
    const snappedPos = await props.mapDisplayRef.snapToPath(
      mapInfo.current_buildingId,
      mapInfo.current_floor.id,
      userPos,
    )
    const heading = position.getRadHeading()
    // console.log("heading :", heading)
    const nearestBeacon = findNearestBeacon(userPos[0], userPos[1], beaconStore.beacons as Beacon[])
    if (nearestBeacon && nearestBeacon?.distance < 0.01)
      position.resetToBeacon(nearestBeacon?.beacon as Beacon)

    props.mapDisplayRef.setUserPosition(snappedPos as [number, number], heading)
    // props.mapDisplayRef.setUserDebugPosition(userPos)
  }, 1000)

  // setInterval(() => {
  //   console.log(position.getPredictionResult());
  // }, 2000)
}

const requestPermissions = async () => {
  await position.imu.requestPermission()
  await position.orien.requestPermission()
  isPermissionGranted.value = position.isPermissionGranted()

  console.log(position.isPermissionGranted())

  if (isPermissionGranted.value) {
    showPopup.value = false // close only when granted
  }
}

const generateRoute = async (poiId: string) => {
  // console.log(`generate a route to ${poiId}`)
  const userPos = position.getPosition()
  const snappedPos = await props.mapDisplayRef.snapToPath(
    mapInfo.current_buildingId,
    mapInfo.current_floor.id,
    userPos,
  )
  // console.log("finding path")
  // run aStar (temp_start → poiId)
  const {
    pathIds,
    clonedGraph,
  } = await props.mapDisplayRef.findPath(snappedPos, poiId)

  // draw
  props.mapDisplayRef.renderRoute(pathIds, clonedGraph)
}

watch(
  () => mapInfo.isMapInitialized,
  (isInitialized) => {
    if (isInitialized) {
      console.log('Map is ready, rendering paths and POIs!')
      // props.mapDisplayRef.renderPaths(mapInfo.current_buildingId, mapInfo.current_floor.id)

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

watch(
  () => isPermissionGranted.value,
  (p) => {
    if (p) initPosition()
  },
)
</script>

<style src="@/style/MapView.css"></style>
