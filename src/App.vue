<template>
  <div class="app-container">
    <MapView />
    <router-view name="searchBar"></router-view>
    <router-view name="menuPanel"></router-view>
  </div>
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>

<style scoped>
.app-container {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
