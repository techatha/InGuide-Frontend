<template>
  <div class="chip" :style="{ backgroundColor: color }">
    <i :class="`fa fa-${icon}`"></i>
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  icon?: string
  color?: string
}>()
</script>

<style src="../style/CategoryChip.css"></style>
