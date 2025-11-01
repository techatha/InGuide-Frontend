<template>
  <div class="search-bar">
    <input
      type="text"
      v-model="uiStore.searchQuery"
      placeholder="Search"
      class="search-input"
      @focus="uiStore.isSearchFocused = true"
      @blur="uiStore.isSearchFocused = false"
    >
    <button class="search-button" @click="handleSearch">
      <font-awesome-icon icon="search"/>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel'

const query = ref('')
const uiStore = useUIMenuPanelStore()

function handleSearch() {
  uiStore.searchQuery = query.value
  uiStore.clearSearch()
}
</script>

<style src="../style/SearchBar.css"></style>
