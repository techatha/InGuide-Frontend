<template>
  <div v-if="!recommendedPOIs">
    <p>Loading recommendations...</p>
  </div>
  <div v-else>
    <h3 class="panel-title">Recommended Place</h3>
    <template v-if="recommendedPOIs">
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
defineOptions({ name: 'RecommendedView' })
import PoiCard from '@/components/PoiCard.vue'
import PoiService from '@/services/PoiService'
import { useMapInfoStore } from '@/stores/mapInfo'
import type { POI } from '@/types/poi'
import { onUnmounted, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const mapInfo = useMapInfoStore()

const recommendedPOIs = ref<POI[] | null>(null)
const isLoading = ref(true)

const POLL_MS = 1000
let timer: number | null = null

function sig(list: POI[] | null) {
  if (!list) return ''
  return list.map((p) => `${p.id}:${p.recommended ? 1 : 0}`).join('|')
}

async function fetchOnce() {
  if (!mapInfo.current_buildingId) return
  try {
    const items = await PoiService.getRecommendedInBuilding(mapInfo.current_buildingId)
    const oldSig = sig(recommendedPOIs.value)
    const newSig = sig(items)
    if (oldSig !== newSig) recommendedPOIs.value = items
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

function startPolling() {
  if (timer) return // prevent duplicates
  timer = window.setInterval(async () => {
    if (!document.hidden) await fetchOnce()
  }, POLL_MS)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// --- ✅ Only start after building info is available ---
watch(
  () => mapInfo.current_buildingId,
  async (buildingId) => {
    if (buildingId) {
      // Optional: wait for floors to be loaded (if needed)
      while (!mapInfo.floors.length) {
        await new Promise((r) => setTimeout(r, 100))
      }

      // Fetch immediately once
      await fetchOnce()

      // Then start polling
      startPolling()
    } else {
      stopPolling()
    }
  },
  { immediate: true },
)

onActivated(startPolling)
onDeactivated(stopPolling)
onUnmounted(stopPolling)

function handleViewDetail(poi: POI) {
  router.push({ name: 'placeDetail', params: { id: poi.id } })
}
</script>
