<template>
  <div id="navigation-top-container" v-if="currentDirection != 'FINISH'">
    <div id="instruction-box">
      <div>
        <div id="direction-indicator">
          <div id="direction-arrow">
            <font-awesome-icon
              v-if="currentDirection"
              :icon="directionIcons[currentDirection]"
              size="2x"
            />
          </div>
          <p>{{ distanceToNextTurn }} m.</p>
        </div>
        <div id="instruction-text">{{ currentInstruction }}</div>
      </div>
    </div>

    <div id="next-turn-box" v-if="nextInstruction">
      <div>
        Then
        <span id="next-turn-arrow">
          <font-awesome-icon v-if="nextDirection" :icon="directionIcons[nextDirection]" />
        </span>
      </div>
    </div>
  </div>

  <div id="navigation-bottom-container">
    <div v-if="currentDirection != 'FINISH'">
      <p id="time-to-destination">{{ estimatedTime }} min</p>
    </div>
    <div v-else>
      <div id="direction-indicator">
        <div id="direction-arrow">
          <font-awesome-icon
            v-if="currentDirection"
            :icon="directionIcons[currentDirection]"
            size="2x"
          />
        </div>
        <p>{{ distanceToNextTurn }} m.</p>
      </div>
      <div id="instruction-text">{{ currentInstruction }}</div>
    </div>
    <div id="bottom-details">
      <p>{{ totalDistance }} m.</p>
      <p>{{ arrivalTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
      <button id="exit-button" @click="showPopup = true">Exit</button>
    </div>
  </div>

  <PopUpWindow name="popup" v-model:visible="showPopup" :show-close-button="false">
    <h2 class="text-xl font-bold mb-2">Are you sure you want to stop navigation?</h2>
    <p class="mb-4">You will return to the map view.</p>

    <div class="popup-actions">
      <button @click="handleExit" class="popup-button primary-button">Yes</button>
      <button @click="showPopup = false" class="popup-button secondary-button">No</button>
    </div>
  </PopUpWindow>
</template>
<script setup lang="ts">
import PopUpWindow from '@/components/PopUpWindow.vue'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useNavigationStore } from '@/stores/navigation'
import { useTurnByTurn } from '@/composables/useTurnByTurn'
import { findNearestBeacon } from '@/utils/findNearestBeacon'
import { usePositioningSystem } from '@/composables/usePositioningSystem'
import { useMapInfoStore } from '@/stores/mapInfo'
import type { Beacon } from '@/types/beacon'
import { useBeaconStore } from '@/stores/beacon'
import router from '@/router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowUp,
  faArrowLeft,
  faArrowRight,
  faArrowTurnDown,
  faFlagCheckered,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'

const showPopup = ref(false)

const mapInfo = useMapInfoStore()
const beaconStore = useBeaconStore()
const navigationStore = useNavigationStore()
const {
  currentInstruction,
  nextInstruction,
  generateInstructions,
  updateUserProgress,
  distanceToNextTurn,
  currentDirection,
  nextDirection,
  totalDistance,
  estimatedTime,
  arrivalTime,
  isAtDestination,
} = useTurnByTurn()
const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapDisplayRef: any
}>()
const position = usePositioningSystem()

const intervalId = ref<number | null>(null) // <-- ADD THIS for the main loop
const arrivalTimerId = ref<number | null>(null)

const directionIcons: { [key: string]: IconDefinition } = {
  STRAIGHT: faArrowUp,
  LEFT: faArrowLeft,
  RIGHT: faArrowRight,
  'U-TURN': faArrowTurnDown,
  FINISH: faFlagCheckered,
}

onMounted(() => {
  if (navigationStore.navigationRoute.length === 0 || !navigationStore.navigationGraph) {
    console.warn('No navigation data found. Redirecting to recommendations.')
    router.push({ name: 'recommend' })
    return // Stop the rest of the function from executing
  }

  if (navigationStore.navigationRoute.length > 0) {
    if (navigationStore.navigationGraph) {
      const currentHeading = position.getRadHeading()
      generateInstructions(
        navigationStore.navigationRoute,
        navigationStore.navigationGraph,
        currentHeading,
      )
    }
  }

  intervalId.value = setInterval(async () => {
    // console.log("UI Updated")
    const userPos = position.getPosition()
    const snappedPos = await props.mapDisplayRef.snapToPath(
      mapInfo.current_buildingId,
      mapInfo.current_floor.id,
      userPos,
    )
    // position.correctWithMapMatching(snappedPos as [number, number]);
    const heading = position.getRadHeading()
    // console.log("heading :", heading)
    const nearestBeacon = findNearestBeacon(userPos[0], userPos[1], beaconStore.beacons as Beacon[])
    if (nearestBeacon && nearestBeacon?.distance < 0.01)
      position.resetToBeacon(nearestBeacon?.beacon as Beacon)

    props.mapDisplayRef.setUserPosition(snappedPos as [number, number], heading)
    // props.mapDisplayRef.setUserDebugPosition(userPos)
    updateUserProgress(snappedPos)

    props.mapDisplayRef.updateRouteProgressView(snappedPos)
  }, 1000)
})

watch(isAtDestination, (hasArrived) => {
  // The watch will trigger when isAtDestination becomes true
  if (hasArrived) {
    console.log('Destination reached (within 5m). Starting redirect timer.')
    const finishTimeout = 15000

    arrivalTimerId.value = setTimeout(() => {
      console.log('Timer finished. Redirecting...')
      handleExit()
    }, finishTimeout)
  }
})

onUnmounted(() => {
  console.log('Navigation view unmounted. Clearing all timers.')
  if (intervalId.value) clearInterval(intervalId.value)
  if (arrivalTimerId.value) clearTimeout(arrivalTimerId.value)
})

function handleExit() {
  if (intervalId.value) clearInterval(intervalId.value)
  if (arrivalTimerId.value) clearTimeout(arrivalTimerId.value)
  props.mapDisplayRef.clearRenderedPath()
  navigationStore.clearNavigation()
  // Add logic here to switch the view back to the main map
  router.push({ name: 'recommend' })
}
</script>
<style>
/*
  * Assumes a parent element wraps the <template> content,
  * e.g., <div id="map-view-parent">...template content...</div>
*/
#map-view-parent {
  /* This is crucial for absolute positioning within its bounds */
  position: relative;
  /* Example size, adjust as needed */
  width: 400px;
  height: 600px;
  /* Add background map/image here if needed */
  background-color: #e8e8e8; /* Light gray background */
}

/*
 * TOP INSTRUCTION BOX STYLES
 */
#navigation-top-container {
  position: absolute;
  top: 20px;
  left: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  /* MODIFIED: Changed to flex-start to align items to the left */
  align-items: flex-start;
}

#instruction-box {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  padding: 10px 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  margin-bottom: -20px;
  /* ADDED: Black border */
  border: 1px solid black;
  min-height: 100px;
}

#instruction-box > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

#instruction-text {
  font-size: 24px; /* Adjusted for better fit */
  /* font-weight: 500; */
  margin: 0;
  padding: 0;
}

#instruction-box p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

/* Next turn 'Then' box styling */
/* Next turn 'Then' box styling */
#next-turn-box {
  position: relative;
  z-index: 1;
  margin-left: 15px;
  background-color: #8ac08a;
  color: white;
  padding: 8px; /* Use smaller padding on the main box now */
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: bold;
  width: 100px;
  height: 50px;
  border: 1px solid black;

  /* --- MODIFIED --- */
  display: flex;
  flex-direction: column; /* Change back to column */
  justify-content: flex-start; /* Align content to the top... */
  align-items: center;
}

/* Re-introduce this rule to style the new wrapper div */
#next-turn-box > div {
  display: flex;
  align-items: center;
  gap: 10px;
  /* ...and add padding to push it down! */
  padding-top: 10px; /* Adjust this value until it looks perfect! */
}

#next-turn-arrow {
  /* MODIFIED: Removed 'display: block' to allow side-by-side layout */
  font-size: 18px;
}

/*
 * BOTTOM CONTROL BOX STYLES
 */
#navigation-bottom-container {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  z-index: 10;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.15);
  padding: 15px;
  text-align: center;
  /* ADDED: Black border */
  border: 1px solid black;
}

#time-to-destination {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 10px 0;
  justify-content: center;
}

#bottom-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

#bottom-details p {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

#exit-button {
  background-color: #d9534f; /* Red-ish color */
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

/* Popup Window specific styles */

.popup-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.popup-button {
  padding: 10px 25px;
  border-radius: 8px;
  font-weight: bold;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-grow: 1; /* Allows the button to grow and fill available space */
  text-align: center; /* Keeps the text centered */
}

.primary-button {
  /* "Yes" button */
  background-color: #7da085; /* Muted sage green */
}

.primary-button:hover {
  background-color: #4f664f; /* Darker green on hover */
}

.secondary-button {
  /* "No" button */
  background-color: #cf4648; /* Muted terracotta red */
}

.secondary-button:hover {
  background-color: #844343; /* Darker red on hover */
}
</style>
