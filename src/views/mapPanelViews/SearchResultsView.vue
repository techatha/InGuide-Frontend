<template>
  <!-- <div class="tag-section">
    <h3 class="panel-title">Finding Nearby</h3>
    <div class="tag-container">
      <CategoryChip label="Restroom" icon="restroom" colorClass="restroom" />
      <CategoryChip label="Lecture" icon="graduation-cap" colorClass="lecture" />
      <CategoryChip label="General" icon="circle" colorClass="general" />
      <CategoryChip label="Computer Lab" icon="desktop" colorClass="lab" />
      <CategoryChip label="Advance Finding" icon="filter" colorClass="advance" />
    </div>
  </div> -->
  <div>
    <h3 class="panel-title">Search Results</h3>
    <template v-if="uiStore.searchResults.length > 0">
      <PoiCard
        v-for="poi in uiStore.searchResults"
        :key="poi.id"
        :poi="poi"
        @view-detail="handleViewDetail"
      />
    </template>

    <p v-else-if="uiStore.searchQuery && uiStore.searchResults.length === 0" class="text-muted" style="padding: 1rem;">
      No results found for "{{ uiStore.searchQuery }}".
    </p>

    <p v-else class="text-muted" style="padding: 1rem;">
      Type in the search bar to find a place.
    </p>
  </div>
</template>

<script setup lang="ts">
// import CategoryChip from '@/components/CategoryChip.vue'
import PoiCard from '@/components/PoiCard.vue'
import { useMapInfoStore } from '@/stores/mapInfo'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
import type { POI } from '@/types/poi'
import { watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()

// --- THIS IS THE CORE LOGIC ---
// Watch the search query from the store
watch(
  () => uiStore.searchQuery,
  () => {
    // When the query changes, call the search action from the store.
    uiStore.performSearch()
  }
)

// This watcher handles the case where POIs load *after* the user has typed
watch(
  () => mapInfo.currentBuildingPOIs,
  (newPOIList) => {
    // If there's already a search query, re-run the search
    if (uiStore.searchQuery && newPOIList.length > 0) {
      uiStore.performSearch()
    }
  }
)

function handleViewDetail(poi: POI) {
  // Navigate to the place's detail page
  router.push({ name: 'placeDetail', params: { id: poi.id } })

  // After clicking a result, clear the search and hide the search view
  uiStore.cancelSearch()
}
</script>

