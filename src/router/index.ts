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
          component:RecommendedView,
        },
        {
          path: 'details/:id', // Matches URLs like /place/123
          name: 'placeDetail',
          component: PoiDetail,
          props: true // This passes the route's :id to the PoiDetail component as a prop
        },
      ]
    },

  ]
})

export default router
