import { createRouter, createWebHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import PoiDetail from '@/views/panelViews/PoiDetailView.vue'
import RecommendedView from '@/views/panelViews/RecommendedView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MapView,
      children: [
        {
          path: '',
          name: 'recommend',
          component: RecommendedView,
        },
        {
          path: 'details/:id',
          name: 'placeDetail',
          component: PoiDetail,
          props: true,
        },
      ],
    },
    {
      path: '/:beaconID',
      name: 'beaconRedirect',
      redirect: (to) => {
        const beaconID = to.params.beaconID as string
        localStorage.setItem('beaconID', beaconID)
        return { name: 'home' }
      },
    },
  ],
})

export default router
