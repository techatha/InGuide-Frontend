<template>
  <div v-if="props.visible"
     class="popup-overlay">
  <div class="popup-content">
    <button @click="close">✕</button>
    <slot />
  </div>
</div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['update:visible'])
function close() {
  emit('update:visible', false)
}
</script>

<style>
.popup-overlay {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
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

</style>
