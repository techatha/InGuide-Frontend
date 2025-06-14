<template>
  <div class="app-container">
    <MapView />
    <!-- Search bar at the top -->
    <router-view name="searchBar" />
    <router-view name="menuPanel" />
  </div>
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>

<style src="./style/AppLayout.css"></style>