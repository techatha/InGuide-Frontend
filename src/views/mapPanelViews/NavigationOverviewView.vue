<template>
  <div class="overview-row" v-if="poi">
    <p class="description">Destination: {{ poi.name }}</p>
    <!-- This div groups the buttons together on the right -->
    <div class="button-group">
      <button class="cancel-btn" @click="cancelOverview">Cancel</button>
      <button class="navigate-btn" @click="startNavigate">Start</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMapInfoStore } from '@/stores/mapInfo'
import PoiService from '@/services/PoiService'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
import type { POI } from '@/types/poi'
import router from '@/router'
import { useNavigationStore } from '@/stores/navigation'

const route = useRoute()
const mapInfo = useMapInfoStore()
const navigationStore = useNavigationStore()
const uiStore = useUIMenuPanelStore()

const poi = ref<POI | null>(null)

const emit = defineEmits<{ (e: 'stop-map-interval'): void }>()

const startNavigate = () => {
  try {
    if (!poi.value) {
      console.error('There is no destination selected')
    }
    console.log(poi.value?.id)
    emit('stop-map-interval')
    // router push
    router.push({ name: 'navigate', params: { id: route.params.id } })
  } catch (error) {
    console.error('There is an error on start navigation', error)
  }
}

const cancelOverview = () => {
  try {
    // This will navigate to the 'recommend' route,
    // inheriting the current :buildingId from the parent route.
    router.push({ name: 'recommend' })
  } catch (error) {
    console.error('There is an error on Cancel navigation', error)
  }
}

onMounted(async () => {
  uiStore.startNavigate()
  poi.value = await PoiService.getPOIById(
    mapInfo.current_buildingId as string,
    route.params.id as string,
  )
})

onUnmounted(() => {
  navigationStore.clearNavigation()
})
</script>

<style>
.overview-row {
  display: flex;
  align-items: center;
  justify-content: space-between; /* pushes button group to the right */
  width: 100%; /* make row span full width */
}

.description {
  color: #5b6675;
  line-height: 1.5;
  margin: 0; /* remove top margin so it aligns nicely */
  /* Prevent text from pushing buttons off-screen */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 16px; /* Add some space between text and buttons */
}

.button-group {
  display: flex;
  gap: 8px; /* Adds space between the buttons */
  /* Prevent buttons from shrinking */
  flex-shrink: 0;
}

.cancel-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  color: #fff;
  background: #9CA3AF; /* Gray background */
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background: #6B7280; /* Darker gray on hover */
}

.navigate-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  color: #fff;
  background: #6e9377;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.navigate-btn:hover {
  background: #57775f;
}
</style>
