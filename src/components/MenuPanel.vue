<template>
  <div
    class="panel"
    :class="{ 
      expand: isExpanded && panelMode === 'list',
      detail: isDetailMode,
      'fully-expand': isFullyExpended && panelMode === 'list'
      }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="drag-bar"></div>
      <div class="expandable-content" v-if="isExpanded">
        <div class="scrollable-content">
          <div class="panel-content">
            <!-- Mode: POI Detail -->
            <PoiDetail 
              v-if="isDetailMode && selectedPOI" 
              :poi="selectedPOI"
              @back="toListMode"
            />
            <template v-else>
              <!-- Mode: Show tag when search bar is tapped -->
              <div v-if="uiStore.isSearchFocused" class="tag-section">
                <h3 class="panel-title">Finding Nearby</h3>
                <div class="tag-container">
                  <CategoryChip label="Restroom" icon="restroom" colorClass="restroom" />
                  <CategoryChip label="Lecture" icon="graduation-cap" colorClass="lecture" />
                  <CategoryChip label="General" icon="circle" colorClass="general" />
                  <CategoryChip label="Computer Lab" icon="desktop" colorClass="lab" />
                  <CategoryChip label="Advance Finding" icon="filter" colorClass="advance" />
                </div>
              </div>

              <!-- Show Recommended Place -->
              <div>
                <h3 class="panel-title">Recommended Place</h3>
                <PoiCard
                  v-for="poi in recommendedPOIs"
                  :key="poi.id"
                  :poi="poi"
                  @view-detail="handleViewDetail"
                />
              </div>
            </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
import { useNavigationStore } from '@/stores/navigation'
import PoiService from '@/services/mocks/PoiService'
import type {POI} from '@/types/poi'
// import { useRouter } from 'vue-router'

import PoiDetail from './PoiDetail.vue'
import PoiCard from './PoiCard.vue'
import CategoryChip from './CategoryChip.vue'

const uiStore = useUIMenuPanelStore()
const nav = useNavigationStore()

const panelMode = ref<'list' | 'detail'>('list')
const startY = ref(0)
const currentY = ref(0)

const isExpanded = ref(false)
const isFullyExpended = computed(() => uiStore.isSearchFocused)
const isDetailMode = computed(() => panelMode.value === 'detail' && !!selectedPOI.value)
const selectedPOI = computed(() => nav.selectedPOI)
const recommendedPOIs = ref<POI[]>([])


onMounted(async () => {
  recommendedPOIs.value = await PoiService.getRecommendedPOIs()
})

// Auto expand/collapse when search bar focus changes
watch(() => uiStore.isSearchFocused, (focused) => {
  isExpanded.value = focused
})

const handleTouchStart = (e: TouchEvent) => {
  startY.value = e.touches[0].clientY
}
const handleTouchMove = (e: TouchEvent) => {
  currentY.value = e.touches[0].clientY
  const deltaY = startY.value - currentY.value
  if (deltaY > 30 && !isExpanded.value) isExpanded.value = true
  else if (deltaY < -30 && isExpanded.value) isExpanded.value = false
}
const handleTouchEnd = () => {
  startY.value = 0
  currentY.value = 0
}

function handleViewDetail(poi: POI) {
  nav.setSelectedPOI(poi)
  panelMode.value = 'detail'
  // ensure it's not fully-expanded by search focus
  try { (uiStore as any).isSearchFocused = false } catch {}
  isExpanded.value = true
}

// Back from detail -> list
function toListMode() {
  panelMode.value = 'list'
  nav.setSelectedPOI(null as any)
  // If you want to keep the panel open in list mode, leave isExpanded true.
  // If you want it to collapse, set: isExpanded.value = false
}

</script>

<style src="../style/MenuPanel.css"></style>