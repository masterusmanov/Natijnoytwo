import { createRouter, createWebHistory } from 'vue-router';
import HomeView from "../views/HomeView.vue";
import DefaultLayout from '../layout/default/index.vue';
import Visualisiation from '../views/Visualisiation/index.vue';
import HandMeasure from '../views/Handmeasure/index.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "layout",
      component: DefaultLayout,
      children: [
        {
          path: "/",
          name: "home",
          component: HomeView,
        },
        {
          path: "/visualization",
          name: " visualization",
          component: Visualisiation
        },
        {
          path: "/handmeasure",
          name: " handmeasure",
          component: HandMeasure
        },
      ],
    },
  ],
});

export default router
