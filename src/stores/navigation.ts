import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { POI } from '@/types/poi' // you already have types/poi.ts

export const useNavigationStore = defineStore('navigation', () => {
  const selectedPOI = ref<POI | null>(null)   // detail screen shows this
  const destination = ref<POI | null>(null)   // nav feature uses this

  function setSelectedPOI(poi: POI | null) { selectedPOI.value = poi }
  function startNavigationTo(poi: POI) { destination.value = poi }

  return { selectedPOI, destination, setSelectedPOI, startNavigationTo }
})