import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/base.css'
import './assets/public.css'
import './assets/native-ui.css'


const app = createApp(App)
const pinia = createPinia()

app.use(pinia).use(router).mount('#app')
