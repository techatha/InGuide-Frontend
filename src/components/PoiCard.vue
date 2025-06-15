<template>
    <div class="poi-card">
        <div class="poi-content">
            <img :src="poi.image" class="poi-img" alt="POI" />
            <div class="poi-details">
                <div class="poi-name">{{ poi.name }}</div>
                <div class="poi-type">{{ poi.type }}</div>
            </div>
        </div>
        <button class="detail-btn">View Detail</button>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    poi: {
        id: number
        name: string
        type: string
        image: string
    }
}>()
</script>

<style src="../style/PoiCard.css"></style>