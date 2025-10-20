// src/composables/useAppInitializer.ts

import { ref } from 'vue'

// This flag will be shared across the entire application
const isAppInitialized = ref(false)

export function useAppInitializer() {
  return {
    isAppInitialized,
  }
}
