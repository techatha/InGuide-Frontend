<template>
    <div class="poi-card">
        <div class="poi-media">
        <!-- show image when present & valid -->
        <img
            v-if="imageUrl"
            :src="imageUrl"
            class="poi-img"
            alt="POI"
            @error="onImgError"
        />
        <!-- fallback placeholder -->
        <div v-else class="poi-placeholder">
            <font-awesome-icon icon="image" />
        </div>
        </div>
        <!-- <img :src="poi.images[0]" class="poi-img" alt="POI" /> -->
        <div class="poi-info">
            <div class="poi-text">
                <div class="poi-name">{{ poi.name }}</div>
                <div class="poi-type">{{ poi.type }}</div>
            </div>
            <div class="poi-button">
                <button class="detail-btn" @click="$emit('view-detail', poi)">View Detail</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
const props = defineProps<{
  poi: {
    id: string | number
    name: string
    type: string
    images: string[]
    recommended?: boolean
  }
}>()

const imgOk = ref(true)
const imageUrl = computed(() => {
  const url = props.poi?.images?.[0]
  return imgOk.value && typeof url === 'string' && url.length > 0 ? url : ''
})
function onImgError() {
  // if the URL is broken, swap to placeholder
  imgOk.value = false
}
</script>

<style src="../style/PoiCard.css"></style>
