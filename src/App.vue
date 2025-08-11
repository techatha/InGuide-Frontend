<template>
  <div class="app-container">
    <MapView v-if="isHome" />
    <router-view name="searchBar" v-if="isHome" />
    <router-view name="menuPanel" v-if="isHome" />

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import MapView from './views/MapView.vue'
import { computed } from 'vue'
import '@fortawesome/fontawesome-free/css/all.min.css'


const route = useRoute()
const isHome = computed(() => route.name === 'home')
</script>

<style src="./style/AppLayout.css"></style>
