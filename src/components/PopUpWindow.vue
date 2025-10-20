<template>
  <div v-if="props.visible"
     class="popup-overlay">
    <div class="popup-content">
      <button
        v-if="props.showCloseButton"
        @click="close"
        class="popup-close-btn">
        ✕
      </button>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  showCloseButton: { type: Boolean, default: true },
})

const emit = defineEmits(['update:visible'])
function close() {
  emit('update:visible', false)
}
</script>

<style>
.popup-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0,0,0,0.5);
  z-index: 10000;
}

.popup-content {
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
  width: 20rem;
}

/* ADDED: New minimal style for the close button */
.popup-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;

  background: none;
  border: none;
  padding: 0;

  font-size: 1.5rem;
  line-height: 1;
  color: #aaa;

  cursor: pointer;
  transition: color 0.2s ease;
}

.popup-close-btn:hover {
  color: #333;
}
</style>
