<template>
  <div class="tag-section">
    <h3 class="panel-title">Finding Nearby</h3>
    <div class="tag-container">
      <CategoryChip label="Restroom" icon="restroom" colorClass="restroom" />
      <CategoryChip label="Lecture" icon="graduation-cap" colorClass="lecture" />
      <CategoryChip label="General" icon="circle" colorClass="general" />
      <CategoryChip label="Computer Lab" icon="desktop" colorClass="lab" />
      <CategoryChip label="Advance Finding" icon="filter" colorClass="advance" />
    </div>
  </div>
</template>

<script setup lang="ts">
import CategoryChip from '@/components/CategoryChip.vue';
</script>

