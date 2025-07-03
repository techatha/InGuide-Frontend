import { defineStore } from "pinia";
import { ref } from "vue";

export const useUIMenuPanelStore = defineStore('uiMenuPanel', () => {
    const isSearchFocused = ref(false)
    return { isSearchFocused }
})