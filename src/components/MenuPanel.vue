<template>
  <div
    class="panel"
    :class="{
      'expand': uiStore.isExpanded,
      'fully-expand': uiStore.isFullyExpanded,
      'detail': uiStore.isShowDetail,
      'navOverview': uiStore.isStartingNav,
    }"
  >
    <div
      class="padding"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="drag-bar"></div>
    </div>
    <div class="expandable-content scrollable-content">
      <div class="panel-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'

const uiStore = useUIMenuPanelStore()
const startY = ref(0)
const currentY = ref(0)

const handleTouchStart = (e: TouchEvent) => {
  startY.value = e.touches[0].clientY
}

const handleTouchMove = (e: TouchEvent) => {
  currentY.value = e.touches[0].clientY
  const deltaY = startY.value - currentY.value

  // Check for upward swipe to expand
  if (deltaY > 30) {
    if (!uiStore.isExpanded && !uiStore.isFullyExpanded) {
      uiStore.expand()
    } else if (uiStore.isExpanded && deltaY > 100) {
      uiStore.fullExpand()
    }
  }
  // Check for downward swipe to collapse
  else if (deltaY < -30) {
    if (uiStore.isFullyExpanded) {
      uiStore.expand()
    } else if (uiStore.isExpanded || uiStore.isShowDetail) {
      uiStore.close()
    }
  }
}

const handleTouchEnd = () => {
  startY.value = 0
  currentY.value = 0
}
</script>

<style src="../style/MenuPanel.css"></style>
