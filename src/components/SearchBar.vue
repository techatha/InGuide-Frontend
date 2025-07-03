<template>
  <div class="search-bar">
    <input 
      type="text"
      v-model="query"
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
  console.log('Search:', query.value)
}
</script>

<style src="../style/SearchBar.css"></style>
