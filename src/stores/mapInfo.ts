import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Floor } from '@/types/floor';

export const useMapInfoStore = defineStore('mapInfo', () => {
  const isMapInitialized = ref(false);
  const current_buildingId = ref<string>('wcnWozOmfZc2zBXxgm1s');
  const current_floor = ref<Floor>({floor: 1, floor_plan_url: '/src/assets/sample-img.jpg', id: 'sampleFloor'});
  const floors = ref<Floor[]>([])

  function changeBuilding(buildingId: string) {
    current_buildingId.value = buildingId;
  }

  function changeCurrentFloor(floor: Floor) {
    current_floor.value = floor;
  }

  function loadFloors(floorList: Floor[]) {
    floors.value = floorList
  }

  function setMapInitialized(status: boolean) {
    isMapInitialized.value = status;
  }

  return {
    isMapInitialized,
    setMapInitialized,
    current_buildingId,
    current_floor,
    floors,
    changeBuilding,
    changeCurrentFloor,
    loadFloors,
  };
});
