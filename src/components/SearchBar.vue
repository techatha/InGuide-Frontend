<template>
  <div class="search-bar">
    <input 
    type="text"
    v-model="query"
    placeholder="Search"
    class="search-input"
    >
    <button class="search-button" @click="handleSearch">
      <font-awesome-icon icon="search"/>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const query = ref('')
    return { query }
  }
})
</script>

<style src="../style/SearchBar.css"></style>
