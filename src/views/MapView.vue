<template>
  <SearchBar />
  <MenuPanel>
    <div v-if="uiStore.isSearchFocused || uiStore.searchQuery.length > 0">
      <SearchResultsView />
    </div>
    <div v-else>
      <RouterView
        @navigate-to="generateRoute"
        @stop-map-interval="stopMapInterval"
        v-slot="{ Component }"
      >
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
import { ref, watch, onUnmounted, onMounted } from 'vue'
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
import { useRouter } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'

const { isAppInitialized } = useAppInitializer()

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
  buildingId: string
}>()
const position = usePositioningSystem()

// CHANGED: Renamed function to 'startMapInterval'
const startMapInterval = async () => {
  // CHANGED: Don't start if already running
  if (isAppInitialized.value && positionIntervalId.value) return

  // This is all your original init logic, runs only once
  if (!isAppInitialized.value) {
    const initBeaconId = localStorage.getItem('beaconID')
    const checkedBeacon = await beaconStore.findBeaconById(initBeaconId ?? '')
    let initialLatLng: [number, number]

    // ** THIS IS THE FIX **
    // Check if the beacon was found AND has latLng
    if (checkedBeacon && checkedBeacon.latLng) {
      initialLatLng = checkedBeacon.latLng
      console.log(`Initializing position with beacon '${initBeaconId}' at ${initialLatLng}`)
    } else {
      // If beacon not found, use a default location (e.g., center of map bounds)
      console.warn(
        `Initial beacon '${initBeaconId}' not found or invalid. Using default map center.`,
      )
      // Calculate a default center from building bounds (ideally get bounds from mapInfo store)
      let defaultLat: number
      let defaultLng: number

      // Check if building data is loaded
      if (
        mapInfo.currentBuilding &&
        mapInfo.currentBuilding.NE_bound &&
        mapInfo.currentBuilding.SW_bound
      ) {
        // Calculate center from building bounds
        defaultLat = (mapInfo.currentBuilding.NE_bound[0] + mapInfo.currentBuilding.SW_bound[0]) / 2
        defaultLng = (mapInfo.currentBuilding.NE_bound[1] + mapInfo.currentBuilding.SW_bound[1]) / 2
        console.log('Using building bounds for default center.')
      } else {
        // Hardcoded fallback if building data isn't ready (use your original values)
        console.warn('Building data not available, using hardcoded fallback center.')
        defaultLat = (18.799062936888 + 18.79977192091592) / 2
        defaultLng = (98.9503180904669 + 98.95093944127089) / 2
      }
      initialLatLng = [defaultLat, defaultLng]
      alert(
        "[ERROR] Can't get user's location, please rescan the QR code for more percise location tracking T-T",
      )
    }
    console.log(initBeaconId)
    console.log(initialLatLng)
    const snappedLatLng = await props.mapDisplayRef.snapToPath(
      mapInfo.current_buildingId,
      mapInfo.current_floor.id,
      initialLatLng,
    )
    position.init(snappedLatLng)
    isAppInitialized.value = true
  }

  // CHANGED: Clear any old interval and start the new one
  if (positionIntervalId.value) clearInterval(positionIntervalId.value)

  console.log('Starting Page 1 (snapToPath) interval')
  positionIntervalId.value = setInterval(async () => {
    try {
      const userPos = position.getPosition()
      if (!userPos || !userPos[0] || !userPos[1]) return

      // --- REMOVE FLOOR CHECK FROM HERE ---
      // Always attempt to snap and set position during browsing.
      // MapDisplay.vue's setUserPosition will handle visibility.

      const snappedPos = await props.mapDisplayRef.snapToPath(
        mapInfo.current_buildingId,
        mapInfo.current_floor.id, // Ensure current_floor is valid here
        userPos,
      )
      if (!snappedPos || !snappedPos[0] || !snappedPos[1]) return // Check snap result

      const heading = position.getRadHeading()
      const currentFloor = position.currentUserFloor.value // Still needed for nearest beacon

      // Call the updated function - MapDisplay will decide to show/hide
      props.mapDisplayRef.setUserPosition(
        snappedPos as [number, number],
        heading,
        currentFloor, // Pass the floor
      )

      // Nearest beacon logic is fine, but only relevant if marker is shown
      if (currentFloor === mapInfo.current_floor?.floor) {
        const nearestBeacon = findNearestBeacon(
          snappedPos[0],
          snappedPos[1],
          beaconStore.currentFloorBeacons,
        )
        if (nearestBeacon && nearestBeacon.distance < 0.01 && nearestBeacon.beacon) {
          position.resetToBeacon(nearestBeacon.beacon)
        }
      }
      // --- END CHANGE ---
    } catch (error) {
      console.error('Error inside map interval (Page 1):', error)
    }
  }, 1000)
  props.mapDisplayRef.setViewToUser()
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

const generateRoute = (poiId: string) => {
  // 2. Get raw user position
  const userPos = position.getPosition() as [number, number]
  if (!userPos || !userPos[0]) {
    console.error('Could not get user position to start navigation.')
    alert('Could not determine your current location.')
    return // Just stop. Don't restart an interval that's already running.
  }

  // --- Add your try...catch here ---
  try {
    // 3. Call the STORE's findPath function
    const { pathIds, clonedGraph } = navigationStore.findPath(userPos, poiId)

    // 4. Check if a path was found
    if (pathIds && pathIds.length > 0) {
      // 5. Update the store
      navigationStore.setNavigationRoute(pathIds)
      navigationStore.setCurrentRouteGraph(clonedGraph)
      navigationStore.setDestination(poiId)

      // 6. Push to the overview route
      router.push({ name: 'navigationOverview', params: { id: poiId } })
    } else {
      console.error('Could not find a path to that destination.')
      alert('A path to that destination could not be found.')
      // 7. Don't restart the interval. Just let the user try again.
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Failed to find path:', error)
    alert('Navigation data is not available for this building. Please contact an administrator.')
  }
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
  { immediate: true },
)

watch(
  () => uiStore.isSearchFocused,
  () => {
    uiStore.fullExpand()
  },
)
watch(
  () => props.buildingId,
  (newBuildingId) => {
    if (newBuildingId) {
      // This async function will update the store
      mapInfo.changeBuilding(newBuildingId)
    }
  },
  { immediate: true }
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
  },
)

onMounted(() => {
  if (props.buildingId) {
    mapInfo.changeBuilding(props.buildingId)
  }
  // This check is the key
  if (isAppInitialized.value) {
    console.log('Component re-mounted, app is already initialized. Starting interval.')
    startMapInterval()
  }
})

// CHANGED: Add unmount hook to clean up the interval if the main view is ever destroyed
onUnmounted(() => {
  stopMapInterval()
})
</script>

<style src="@/style/MapView.css"></style>
