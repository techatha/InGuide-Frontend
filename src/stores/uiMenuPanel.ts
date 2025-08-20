import { defineStore } from "pinia";
import { ref } from "vue";

export const useUIMenuPanelStore = defineStore('uiMenuPanel', () => {
    const isSearchFocused = ref(false)
    const isExpanded = ref(false)
    const isFullyExpanded = ref(false)
    const isShowDetail = ref(false)

    function showDetail() {
      isExpanded.value = false;
      isFullyExpanded.value = false;
      isShowDetail.value = true;
    }
    function expand() {
      isExpanded.value = true;
      isFullyExpanded.value = false;
      isShowDetail.value = false;
    }
    function fullExpand() {
      isExpanded.value = false;
      isFullyExpanded.value = true;
      isShowDetail.value = false;
    }
    function close() {
      isExpanded.value = false;
      isFullyExpanded.value = false;
      isShowDetail.value = false;
    }

    return {
      isSearchFocused,
      isExpanded,
      isFullyExpanded,
      isShowDetail,
      showDetail,
      expand,
      fullExpand,
      close,
    }
})
