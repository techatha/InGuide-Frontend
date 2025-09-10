import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Floor } from '@/types/floor';
import type { POI } from '@/types/poi';

export const useMapInfoStore = defineStore('mapInfo', () => {
  const dummyFloor = {floor: 3, floor_plan_url: '/src/assets/sample-img.jpg', id: 'sampleFloor'};

  const isMapInitialized = ref(false);
  const current_buildingId = ref<string>('wcnWozOmfZc2zBXxgm1s');
  const floors = ref<Floor[]>([]);
  const POIs = ref<POI[]>([])
  const current_floor = ref<Floor>(dummyFloor);

  function changeBuilding(buildingId: string) {
    current_buildingId.value = buildingId;
  }

  function changeCurrentFloor(floor: Floor) {
    current_floor.value = floor;
  }

  function loadPOIs(pois: POI[]) {
    POIs.value = pois;
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
    POIs,
    loadPOIs,
    floors,
    changeBuilding,
    changeCurrentFloor,
    loadFloors,
  };
});
