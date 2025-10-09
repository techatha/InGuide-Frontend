import { defineStore } from "pinia";
import { ref } from "vue";

export const useNavigationStore = defineStore('navigation', () => {
  const destinationID = ref<string | null>(null)
  const navigationRoute = ref<string[]>([])

  function setDestination(id: string, route: string[]) {
    destinationID.value = id
    navigationRoute.value = route
  }

  return {
    setDestination,
  }
})
