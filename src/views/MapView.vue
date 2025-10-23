<template>
  <SearchBar />
  <MenuPanel>
    <div v-show="uiStore.isSearchFocused">
      <SearchResultsView />
    </div>
    <div v-show="!uiStore.isSearchFocused">
      <RouterView @navigate-to="generateRoute" v-slot="{ Component }">
        <keep-alive include="RecommendedView">
          <component :is="Component" />
        </keep-alive>
      </RouterView>
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
// CHANGED: Added onUnmounted
import { ref, watch, onUnmounted } from 'vue'
import { useAppInitializer } from '@/composables/useAppInitializer'
import { usePositioningSystem } from '@/composables/usePositioningSystem'
import { useMapInfoStore } from '@/stores/mapInfo'
import { useBeaconStore } from '@/stores/beacon'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
// vue component
import SearchBar from '@/components/SearchBar.vue'
import PopUpWindow from '@/components/PopUpWindow.vue'
import MenuPanel from '@/components/MenuPanel.vue'
import SearchResultsView from '@/views/mapPanelViews/SearchResultsView.vue'
import { findNearestBeacon } from '@/utils/findNearestBeacon'
import type { Beacon } from '@/types/beacon'
import { useRoute, useRouter } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'

const { isAppInitialized } = useAppInitializer()

const route = useRoute()
const router = useRouter()

const showPopup = ref(false)
const isPermissionGranted = ref(false)
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()
const beaconStore = useBeaconStore()
const navigationStore = useNavigationStore()

// CHANGED: Added ref to store the interval ID
const positionIntervalId = ref<number | null>(null)

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapDisplayRef: any
}>()
const position = usePositioningSystem()

// CHANGED: Renamed function to 'startMapInterval'
const startMapInterval = async () => {
  // CHANGED: Don't start if already running
  if (isAppInitialized.value && positionIntervalId.value) return

  // This is all your original init logic, runs only once
  if (!isAppInitialized.value) {
    const initBeacon = localStorage.getItem('beaconID')
    const checkedBeacon = await beaconStore.findBeaconById(initBeacon ?? '')
    const latLng = checkedBeacon.latLng
    console.log(initBeacon)
    console.log(latLng)
    const snappedLatLng = await props.mapDisplayRef.snapToPath(
      mapInfo.current_buildingId,
      mapInfo.current_floor.id,
      latLng
    )
    position.init(snappedLatLng)
    isAppInitialized.value = true
  }

  // CHANGED: Clear any old interval and start the new one
  if (positionIntervalId.value) clearInterval(positionIntervalId.value)

  console.log('Starting Page 1 (snapToPath) interval')
  positionIntervalId.value = setInterval(async () => {
    // console.log("UI Updated")
    const userPos = position.getPosition()
    const snappedPos = await props.mapDisplayRef.snapToPath(
      mapInfo.current_buildingId,
      mapInfo.current_floor.id,
      userPos
    )
    const heading = position.getRadHeading()
    // console.log("heading :", heading)
    const nearestBeacon = findNearestBeacon(userPos[0], userPos[1], beaconStore.beacons as Beacon[])
    if (nearestBeacon && nearestBeacon?.distance < 0.01)
      position.resetToBeacon(nearestBeacon?.beacon as Beacon)

    props.mapDisplayRef.setUserPosition(snappedPos as [number, number], heading)
    // props.mapDisplayRef.setUserDebugPosition(userPos)
  }, 1000)
}

// CHANGED: Added new function to stop the interval
const stopMapInterval = () => {
  if (positionIntervalId.value) {
    clearInterval(positionIntervalId.value)
    positionIntervalId.value = null
    console.log('Stopped Page 1 (snapToPath) interval')
  }
}

const requestPermissions = async () => {
  await position.imu.requestPermission()
  await position.orien.requestPermission()
  isPermissionGranted.value = position.isPermissionGranted()

  console.log(position.isPermissionGranted())

  if (isPermissionGranted.value) {
    showPopup.value = false // close only when granted
    // CHANGED: Use new function name
    startMapInterval()
  }
}

const generateRoute = async (poiId: string) => {
  // CHANGED: CRITICAL - Stop the map interval before navigating
  stopMapInterval()

  // console.log(`generate a route to ${poiId}`)
  const userPos = position.getPosition()
  const snappedPos = await props.mapDisplayRef.snapToPath(
    mapInfo.current_buildingId,
    mapInfo.current_floor.id,
    userPos
  )
  // console.log("finding path")
  // run aStar (temp_start → poiId)
  const { pathIds, clonedGraph } = await props.mapDisplayRef.findPath(snappedPos, poiId)

  console.log(pathIds)
  console.log(clonedGraph)

  navigationStore.setNavigationRoute(pathIds)
  navigationStore.setNavigationGraph(clonedGraph)

  // draw
  props.mapDisplayRef.renderRoute(pathIds, clonedGraph)
  router.push({ name: 'navigationOverview', params: { id: route.params.id } })
}

watch(
  () => mapInfo.isMapInitialized,
  (isInitialized) => {
    if (isInitialized) {
      // If the app has already been set up, do nothing.
      // CHANGED: Modified this check slightly
      if (isAppInitialized.value) return

      console.log('Map is ready, checking permissions for the first time!')

      const POIs = mapInfo.floorPOIs
      props.mapDisplayRef.renderPOIs(POIs)

      isPermissionGranted.value = position.isPermissionGranted()

      if (!isPermissionGranted.value) {
        // Show popup if no permission
        setTimeout(() => {
          showPopup.value = true
        }, 1000)
      } else {
        // Initialize if permission is already granted
        // CHANGED: Use new function name
        startMapInterval()
      }
    }
  },
  { immediate: true }
)

watch(
  () => uiStore.isSearchFocused,
  () => {
    uiStore.fullExpand()
  }
)

// CHANGED: Add new watcher to restart the map interval when navigation ends
watch(
  () => navigationStore.navigationRoute.length,
  (newLength, oldLength) => {
    // Check if navigation just ended (route length went from >0 to 0)
    if (oldLength > 0 && newLength === 0 && isAppInitialized.value) {
      console.log('Navigation ended, restarting Page 1 (snapToPath) interval')
      startMapInterval()
    }
  }
)

// CHANGED: Add unmount hook to clean up the interval if the main view is ever destroyed
onUnmounted(() => {
  stopMapInterval()
})
</script>

<style src="@/style/MapView.css"></style>
