<template>
  <div class="overview-row" v-if="poi">
    <p class="description">Destination: {{ poi.name }}</p>
    <button class="navigate-btn">Start</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useMapInfoStore } from "@/stores/mapInfo"
import PoiService from "@/services/PoiService"
import { useUIMenuPanelStore } from "@/stores/uiMenuPanel"

const route = useRoute()
const mapInfo = useMapInfoStore()
const uiStore = useUIMenuPanelStore()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const poi = ref<any>(null)

onMounted(async () => {
  uiStore.startNavigate()
  poi.value = await PoiService.getPOIById(mapInfo.current_buildingId, route.params.id as string)
})
</script>

<style>
.overview-row {
  display: flex;
  align-items: center;
  justify-content: space-between; /* pushes button to the right */
  width: 100%; /* make row span full width */
}

.description {
  color:#5b6675;
  line-height:1.5;
  margin: 0; /* remove top margin so it aligns nicely */
}

.navigate-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  color:#fff;
  background: #6e9377;
  cursor: pointer;
}

.navigate-btn:hover {
  background: #57775f;
}
</style>
