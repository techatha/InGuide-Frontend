<template>
    <div class="poi-card">
        <img :src="poi.images[0]" class="poi-img" alt="POI" />
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
defineProps<{
    poi: {
        id: string | number
        name: string
        type: string
        images: string[]
        recommended?: boolean
    }
}>()
</script>

<style src="../style/PoiCard.css"></style>
