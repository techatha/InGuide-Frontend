<template>
  <div v-if="isLoading">
    <p>Loading recommendations...</p>
  </div>
  <div v-else>
    <h3 class="panel-title">Recommended Place</h3>
    <template v-if="recommendedPOIs.length">
      <PoiCard
        v-for="poi in recommendedPOIs"
        :key="poi.id"
        :poi="poi"
        @view-detail="handleViewDetail"
      />
    </template>
    <p v-else class="text-muted">No recommended places yet.</p>
  </div>
</template>


<script setup lang="ts">
import PoiCard from '@/components/PoiCard.vue'
import PoiService from '@/services/PoiService';
import { useMapInfoStore } from '@/stores/mapInfo';
import type { POI } from '@/types/poi';
import { onMounted, onUnmounted, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const mapInfo = useMapInfoStore()

const recommendedPOIs = ref<POI[]>([])
const isLoading = ref(true);

// --- polling config ---
const POLL_MS = 500
let timer: number | null = null
let abort: AbortController | null = null

function sig(list: POI[]) {
  // a tiny signature to detect relevant changes (id + recommended)
  return list.map(p => `${p.id}:${p.recommended ? 1 : 0}`).join('|')
}

async function fetchOnce() {
  if (!mapInfo.current_buildingId) return
  try {
    // cancel previous in-flight request (optional)
    abort?.abort()
    abort = new AbortController()

    // Pick ONE of these:
    const items: POI[] =
      await PoiService.getRecommendedInBuilding(mapInfo.current_buildingId, abort.signal)
    // OR:
    // await PoiService.getRecommendedOnFloor(mapInfo.current_buildingId, mapInfo.current_floor.id, abort.signal)

    items.sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0) || (a.name || '').localeCompare(b.name || ''))

    // only update when it actually changed
    const oldSig = sig(recommendedPOIs.value)
    const newSig = sig(items)
    if (oldSig !== newSig) recommendedPOIs.value = items
  } catch (e: any) {
    // ignore aborted requests
    if (e?.name !== 'CanceledError' && e?.message !== 'canceled') {
      console.error('poll error', e)
    }
  } finally {
    isLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  isLoading.value = true
  fetchOnce()
  timer = window.setInterval(() => {
    // pause polling when the tab is hidden
    if (document.hidden) return
    fetchOnce()
  }, POLL_MS)
}

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null }
  abort?.abort(); abort = null
}

onMounted(startPolling)
onUnmounted(stopPolling)
onActivated(() => {
  isLoading.value = true;
  startPolling();
})
onDeactivated(() => {
  stopPolling();
})

watch(() => mapInfo.current_buildingId, startPolling)

function handleViewDetail(poi: POI) {
  router.push({ name: 'placeDetail', params: { id: poi.id } })
}

</script>
