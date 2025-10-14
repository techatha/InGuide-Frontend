import type { NavigationGraph } from "@/types/path";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useNavigationStore = defineStore('navigation', () => {
  const destinationID = ref<string | null>(null)
  const navigationRoute = ref<string[]>([])
  const navigationGraph = ref<NavigationGraph | null>(null)

  const isNavigating = computed(() => navigationRoute.value.length > 0)

  function setDestination(id: string, route?: string[]) {
    destinationID.value = id
    if (route) navigationRoute.value = route
  }

  function clearNavigation() {
    destinationID.value = null
    navigationRoute.value = []
  }

  function setNavigationRoute(route: string[]) {
    navigationRoute.value = route
  }

  function setNavigationGraph(graph: NavigationGraph) {
    navigationGraph.value = graph
  }

  return {
    destinationID,
    navigationRoute,
    navigationGraph,
    isNavigating,
    setDestination,
    clearNavigation,
    setNavigationRoute,
    setNavigationGraph,
  }
})
