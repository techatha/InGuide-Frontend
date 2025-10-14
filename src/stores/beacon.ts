// src/stores/beacon.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Beacon } from '@/types/beacon'

const dummyBeacon:Beacon = {
  beaconId: 'testBeacon',
  name: 'Test Beacon',
  latLng: [18.79966064431139, 98.95053522655873]
}

export const useBeaconStore = defineStore('beacon', () => {
  const beacons = ref<Beacon[] | null>(null)

  function loadBeacons(newBeacons: Beacon[]) {
    beacons.value = newBeacons
  }

  function clearBeacons() {
    beacons.value = null
  }

  function findBeaconById(beaconId: string): Beacon  {
    console.log("ckeck", !beacons.value)
    console.log(beacons.value?.length)
    if (!beacons.value) return dummyBeacon
    const trimmedIdToFind = beaconId.trim();
    return beacons.value.find(b => b.beaconId === trimmedIdToFind) ?? dummyBeacon
  }

  return { beacons, loadBeacons, clearBeacons, findBeaconById }
})
