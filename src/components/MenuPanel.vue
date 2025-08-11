<template>
  <div
    class="panel"
    :class="{ expand: isExpanded, 'fully-expand': isFullyExpended }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="drag-bar"></div>
    <div class="expandable-content" v-if="isExpanded">
      <div class="scrollable-content">
        <div class="panel-content">
        <!-- Show tag when search bar is tapped -->
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
      </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'
import PoiCard from './PoiCard.vue'
import PoiService from '@/services/mocks/PoiService'
import type {POI} from '@/types/poi'
import CategoryChip from './CategoryChip.vue'

const isExpanded = ref(false)
const isFullyExpended = computed(() => uiStore.isSearchFocused)
const startY = ref(0)
const currentY = ref(0)
const recommendedPOIs = ref<POI[]>([])
const uiStore = useUIMenuPanelStore()

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
const handleViewDetail = (poi: POI) => {
  console.log('View Detail for:', poi.name)
}
</script>

<style src="../style/MenuPanel.css"></style>
