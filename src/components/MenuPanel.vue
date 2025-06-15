<template>
  <div
    class="panel"
    :class="{ expand: isExpanded }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="drag-bar"></div>
    <div class="expandable-content" v-if="isExpanded">
      <p>Swipe Panel Content goes here...</p>
      <div class="panel-section">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PoiCard from './PoiCard.vue'
import PoiService, { type POI } from '@/services/PoiService'

const isExpanded = ref(true)
const startY = ref(0)
const currentY = ref(0)
const recommendedPOIs = ref<POI[]>([])

onMounted(async () => {
  recommendedPOIs.value = await PoiService.getRecommendedPOIs()
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
