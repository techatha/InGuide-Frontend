<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <div v-if="!poi" class="loading-state">
    <p>Loading details...</p>
  </div>

  <div v-else class="detail-card">
    <!-- Back button + POI name -->
    <div class="header">
      <div class="header-left">
        <button class="poi-detail-back-btn" @click="backToList" aria-label="Back">
          <font-awesome-icon icon="chevron-left" />
        </button>
        <h1 class="header-poi-name">{{ poi.name }}</h1>
      </div>
      <button class="navigate-btn" @click="console.log('start nav!')">Navigate</button>
    </div>

    <!-- POI type + it's floor -->
    <div class="subtitle">
      <span class="sub-poi-type">{{ poi.type }}</span>
      <span v-if="poi.floor !== undefined" class="sub-poi-floor">Floor: {{ poi.floor }}</span>
    </div>

    <!-- POI image(s) -->
     <div class="gallery">
      <template v-if="galleryImages.length">
        <img v-for="(src, i) in galleryImages" :key="i" :src="src" alt="POI image" />
      </template>
      <div v-else class="img-placeholder">
        <font-awesome-icon icon="image" />
      </div>
    </div>
    <!-- <div class="gallery" v-if="galleryImages?.length">
      <img v-for="(src, i) in galleryImages" :key="i" :src="src" alt="POI image" />
    </div> -->

    <!-- POI detail -->
    <p class="description" v-if="poi.detail">{{ poi.detail }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router';
import PoiService from '@/services/PoiService';
import type { POI } from '@/types/poi'
import { useMapInfoStore } from '@/stores/mapInfo';
import { useUIMenuPanelStore } from '@/stores/uiMenuPanel';

const props = defineProps<{ id: string }>();
const router = useRouter();
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()

const building_id = mapInfo.current_buildingId
const poi = ref<POI | null>(null);

// const fetchData = async (id: string) => {
//   uiStore.showDetail()
//   poi.value = await PoiService.getPOIById(building_id, id);
// };
async function fetchData(id: string) {
  uiStore.showDetail()
  poi.value = await PoiService.getPOIById(building_id, id)
}

// onMounted(() => {
//   fetchData(props.id);
// });
onMounted(() => { fetchData(props.id) })

watch(() =>  props.id , () => {
  poi.value = null
  fetchData(props.id)
})

// Build the gallery from poi.images (preferred) or single poi.image (fallback).
// No repetition: we just show however many exist, capped at 3.
// const galleryImages = computed(() => {
//   const imgs = poi.value?.images
//   return imgs?.slice(0, 3)
// })
const galleryImages = computed<string[]>(() => {
  const imgs = poi.value?.images ?? []
  return Array.isArray(imgs) ? imgs.filter(Boolean).slice(0, 3) : []
})

// function backToList() {
//   const historyLength = window.history.length;
//   if (historyLength > 1) {
//     router.back();
//   } else {
//     router.push({ name: 'recommend' });
//   }
// }
function backToList() {
  // Go explicitly to the Recommend panel so it restores correctly
  router.push({ name: 'recommend' })
  // If your panel store has a "list" mode, flip it here too (optional):
  // uiStore.showList()
}
</script>

<style src="@/style/PoiDetail.css"></style>
