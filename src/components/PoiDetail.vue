<template>
  <div class="detail-card">
    <div class="header">
      <h1 class="title">{{ poi.name }}</h1>
    </div>

    <div class="subtitle">
      {{ poi.type }}
      <button class="navigate" @click="startNav">Navigate</button>
    </div>

    <!-- Always use the gallery; show up to 3 images if present, otherwise 1 -->
    <!-- edit later -->
    <div class="gallery" v-if="galleryImages.length">
      <img
        v-for="(src, i) in galleryImages"
        :key="i"
        :src="src"
        alt="POI image"
      />
    </div>

    <p class="desc" v-if="poi.detail">{{ poi.detail }}</p>
    <button class="back-inline" @click="backToList">← Back</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { POI } from '@/types/poi'
import { useNavigationStore } from '@/stores/navigation'

const props = defineProps<{ poi: POI }>()
const nav = useNavigationStore()
const emit = defineEmits<{ (e: 'back'): void }>()

// Build the gallery from poi.images (preferred) or single poi.image (fallback).
// No repetition: we just show however many exist, capped at 3.
const galleryImages = computed(() => {
  const imgs = props.poi.images?.length
    ? props.poi.images
    : (props.poi.image ? [props.poi.image] : [])
  return imgs.slice(0, 3)
})

function startNav() {
  nav.startNavigationTo?.(props.poi)
}

function backToList() {
  nav.setSelectedPOI(null as any)
  emit('back')
}
</script>

<style src="../style/PoiDetail.css"></style>
