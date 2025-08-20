<template>
  <div class="app-container">
    <FloorMap/>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import {  RouterView } from 'vue-router'
import FloorMap from './components/FloorMap.vue'
</script>

<style src="@/style/AppLayout.css"></style>
