<template>
<div class="chip" :class="colorClass">
    <font-awesome-icon :icon="icon" />
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
defineProps<{
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any
  colorClass: string
}>()
</script>

<style src="../style/CategoryChip.css"></style>
