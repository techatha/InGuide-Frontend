<template>
  <div class="search-page">
    <SearchBar v-model="query" />

    <div class="nearby-section">
      <h2>Finding Nearby</h2>
      <div class="tag-container">
        <div class="tag restroom">
          <font-awesome-icon icon="restroom" />
          Restroom
        </div>
        <div class="tag lecture">
          <font-awesome-icon icon="graduation-cap" />
          Lecture
        </div>
        <div class="tag general">
          <font-awesome-icon icon="circle" />
          General
        </div>
        <div class="tag lab">
          <font-awesome-icon icon="desktop" />
          Computer Lab
        </div>
        <div class="tag advance">
          <font-awesome-icon icon="filter" />
          Advance Finding
        </div>
      </div>
    </div>

    <div class="recommended-section">
      <h2>Recommended Place</h2>
      <PoiCard
        v-for="poi in recommendedPOIs"
        :key="poi.id"
        :poi="poi"
        @view-detail="handleViewDetail"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SearchBar from '@/components/SearchBar.vue'
import PoiCard from '@/components/PoiCard.vue'
import PoiService, { type POI } from '@/services/PoiService'

const query = ref('')
const recommendedPOIs = ref<POI[]>([])

onMounted(async () => {
  recommendedPOIs.value = await PoiService.getRecommendedPOIs()
})

function handleViewDetail(poi: POI) {
  console.log('View detail for:', poi)
}
</script>

<style src="../style/SearchingPage.css"></style>
