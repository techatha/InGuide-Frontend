<template>
  <div v-if="isLoading">
    <p>Loading recommendations...</p>
  </div>
  <div v-else>
    <h3 class="panel-title">Recommended Place</h3>
    <PoiCard
      v-for="poi in recommendedPOIs"
      :key="poi.id"
      :poi="poi"
      @view-detail="handleViewDetail"
    />
  </div>
</template>


<script setup lang="ts">
import PoiCard from '@/components/PoiCard.vue'
import PoiService from '@/services/PoiService';
import { useMapInfoStore } from '@/stores/mapInfo';
import type { POI } from '@/types/poi';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const mapInfo = useMapInfoStore()
const recommendedPOIs = ref<POI[]>([])

const isLoading = ref(true);

onMounted(async() => {
  const buildingId = mapInfo.current_buildingId
  // CHANGE TO RECCOMMEND SERVICE LATER (NO ROUTE FOR THAT YET)
  const floor = 3
  try {
    recommendedPOIs.value = await PoiService.getPOIs(buildingId, floor);
  } catch (error) {
    console.error("Failed to fetch POIs:", error);
  } finally {
    isLoading.value = false; 
  }
})

function handleViewDetail(poi: POI) {
  // Use router.push() to navigate to the nested route
  router.push({
    name: 'placeDetail', // The name of your nested route
    params: { id: poi.id } // The dynamic part of the URL
  });
}
</script>
