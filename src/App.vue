<template>
  <div class="app-container">
    <MapView />
    <SearchBar />
    <MenuPanel />
  </div>
</template>

<script setup lang="ts">
import SearchBar from './components/SearchBar.vue'
import MapView from './components/MapView.vue'
import MenuPanel from './components/MenuPanel.vue'
</script>

<style scoped>
.app-container {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
