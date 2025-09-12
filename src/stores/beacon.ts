// src/stores/beacon.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Beacon } from '@/types/beacon'

const dummyBeacon:Beacon = {
  beaconId: 'testBeacon',
  name: 'Test Beacon',
  latLng: [18.79916175104176, 98.9504510164261]
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
    if (!beacons.value) return dummyBeacon
    return beacons.value.find(b => b.beaconId === beaconId) || dummyBeacon
  }

  return { beacons, loadBeacons, clearBeacons, findBeaconById }
})
