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
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ExpandableSearch',
  data() {
    return {
      isExpanded: false,
      startY: 0,
      currentY: 0,
    }
  },
  methods: {
    handleTouchStart(e: TouchEvent) {
      this.startY = e.touches[0].clientY
    },
    handleTouchMove(e: TouchEvent) {
      this.currentY = e.touches[0].clientY
      const deltaY = this.startY - this.currentY

      // Only trigger expansion if swiping upward
      if (deltaY > 30 && !this.isExpanded) {
        this.isExpanded = true
      } else if (deltaY < -30 && this.isExpanded) {
        this.isExpanded = false
      }
    },
    handleTouchEnd() {
      // Reset touch positions
      this.startY = 0
      this.currentY = 0
    },
  },
})
</script>

<style scoped>
.panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5vh;
  background-color: #ffc0cb;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: all 0.3s ease;
  overflow: hidden;
  z-index: 9999;
}

.panel.expand {
  height: 85vh;
}

.drag-bar {
  width: 60px;
  height: 5px;
  background-color: #333;
  border-radius: 3px;
  margin: 0 auto 10px;
}
</style>
