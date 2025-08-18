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
import { computed} from 'vue'
// vue components
import MapView from './views/MapView.vue'
const route = useRoute()
const isHome = computed(() => route.name === 'home')
</script>

<style src="@/style/AppLayout.css"></style>
