import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIMenuPanelStore = defineStore('uiMenuPanel', () => {
  const isSearchFocused = ref(false)
  const isExpanded = ref(false)
  const isFullyExpanded = ref(false)
  const isShowDetail = ref(false)
  const isStartingNav = ref(false)

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
