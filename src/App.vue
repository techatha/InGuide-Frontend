<template>
  <div class="app-container">
    <MapDisplay ref="mapDisplayRef" />
    <RouterView :mapDisplayRef="mapDisplayRef" />
  </div>
</template>

<script setup lang="ts">
import MapDisplay from './components/MapDisplay.vue'
import { ref } from 'vue'

const mapDisplayRef = ref<InstanceType<typeof MapDisplay>>()
</script>


<style src="@/style/AppLayout.css"></style>
