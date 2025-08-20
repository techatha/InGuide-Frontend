<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <SearchBar/>
  <MenuPanel>
    <RouterView/>
  </MenuPanel>
  <PopUpWindow name="popup" v-model:visible="showPopup">
    <h2 class="text-xl font-bold mb-2">Welcome to InGuide!</h2>
    <p class="mb-4">🙏 Please enable Sensor API.</p>
    <button @click="initPosition" class="mt-4 px-3 py-2 bg-blue-600 text-white rounded-lg">
      Enable sensor API
    </button>
  </PopUpWindow>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as map from '@/composables/useMap'
import * as path from '@/composables/usePath'
import * as position from '@/composables/usePositioningSystem'
import * as poi from '@/composables/usePOI'
// vue component
import SearchBar from '@/components/SearchBar.vue'
import PopUpWindow from '@/components/PopUpWindow.vue'
import MenuPanel from '@/components/MenuPanel.vue'
const showPopup = ref(false)


const initPosition = () => {
  position.init()
  setInterval(async () => {
    // console.log("predicted: ", position.getPredictionResult())
    // console.log("read position: ", position.getPosition())
    const userPos = position.getPosition()
    const snappedPos = await path.snapToPath(userPos)
    const heading = position.getRadHeading()
    // console.log("snapped: ", snappedPos)
    map.setUserPosition(snappedPos as [number, number], heading)
    map.setUserDebugPosition(userPos)
  }, 1000)
  setInterval(() => {
    // console.log(position.getPredictionResult());
  }, 2000)
  showPopup.value = false;
}

onMounted(() => {
  path.renderPaths()
  poi.renderAllPOI()
  setTimeout(() => {
    if(position.isAvailable()){
      showPopup.value = true
    }
  }, 1000)
})
</script>

<style src="../style/MapView.css"></style>
