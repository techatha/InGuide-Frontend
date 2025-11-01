import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMapInfoStore } from './mapInfo'
import type { POI } from '@/types/poi'

export const useUIMenuPanelStore = defineStore('uiMenuPanel', () => {
  const isSearchFocused = ref(false)
  const isExpanded = ref(false)
  const isFullyExpanded = ref(false)
  const isShowDetail = ref(false)
  const isStartingNav = ref(false)

  const searchQuery = ref('')
  const searchResults = ref<POI[]>([])

  // --- NEW "Search Service" Action ---
  function performSearch() {
    const mapInfo = useMapInfoStore() // Get the other store
    const allPOIs = mapInfo.currentBuildingPOIs

    const query = searchQuery.value.trim().toLowerCase()

    if (!query) {
      searchResults.value = [] // Clear results if query is empty
      return
    }

    // Filter the full POI list from the mapInfo store
    searchResults.value = allPOIs.filter(poi => {
      const nameMatch = poi.name.toLowerCase().includes(query)
      return nameMatch
    })
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
  }

  function cancelSearch() {
    clearSearch()
    isSearchFocused.value = false
  }

  function showDetail() {
    isExpanded.value = false
    isFullyExpanded.value = false
    isShowDetail.value = true
    isStartingNav.value = false
  }
  function expand() {
    isExpanded.value = true
    isFullyExpanded.value = false
    isShowDetail.value = false
    isStartingNav.value = false
  }
  function fullExpand() {
    isExpanded.value = false
    isFullyExpanded.value = true
    isShowDetail.value = false
    isStartingNav.value = false
  }
  function startNavigate() {
    isExpanded.value = false
    isFullyExpanded.value = false
    isShowDetail.value = false
    isStartingNav.value = true
  }
  function close() {
    isExpanded.value = false
    isFullyExpanded.value = false
    isShowDetail.value = false
    isStartingNav.value = false
  }

  return {
    searchQuery,
    searchResults,
    performSearch,
    clearSearch,
    cancelSearch,

    isSearchFocused,
    isExpanded,
    isFullyExpanded,
    isShowDetail,
    isStartingNav,
    showDetail,
    expand,
    fullExpand,
    startNavigate,
    close,
  }
})
