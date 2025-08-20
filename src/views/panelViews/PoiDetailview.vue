<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<template>
  <div v-if="!poi" class="loading-state">
    <p>Loading details...</p>
  </div>

  <div v-else class="detail-card">
    <div class="header">
      <h1 class="title">{{ poi.name }}</h1>
    </div>

    <div class="subtitle">
      {{ poi.type }}
      <button class="navigate" @click="console.log('start nav!')">Navigate</button>
    </div>

    <div class="gallery" v-if="galleryImages?.length">
      <img v-for="(src, i) in galleryImages" :key="i" :src="src" alt="POI image" />
    </div>

    <p class="desc" v-if="poi.detail">{{ poi.detail }}</p>
    <button class="back-inline" @click="backToList">← Back</button>
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

const fetchData = async (id: string) => {
  uiStore.showDetail()
  poi.value = await PoiService.getPOIById(building_id, id);
};

onMounted(() => {
  fetchData(props.id);
});

watch(() =>  props.id , () => {
  poi.value = null
  fetchData(props.id)
})

// Build the gallery from poi.images (preferred) or single poi.image (fallback).
// No repetition: we just show however many exist, capped at 3.
const galleryImages = computed(() => {
  const imgs = poi.value?.images
  return imgs?.slice(0, 3)
})

function backToList() {
  const historyLength = window.history.length;
  if (historyLength > 1) {
    router.back();
  } else {
    router.push({ name: 'recommend' });
  }
}
</script>

<style src="@/style/PoiDetail.css"></style>
