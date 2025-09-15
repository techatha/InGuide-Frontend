import './assets/main.css'
import 'leaflet/dist/leaflet.css';

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
    faSearch, 
    faRestroom,
    faGraduationCap,
    faCircle,
    faDesktop,
    faFilter,
    faImage  } from '@fortawesome/free-solid-svg-icons'
library.add(
    faSearch, 
    faRestroom, 
    faGraduationCap, 
    faCircle, 
    faDesktop, 
    faFilter,
    faImage)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)

app.use(createPinia())
app.use(router)

app.mount('#app')
