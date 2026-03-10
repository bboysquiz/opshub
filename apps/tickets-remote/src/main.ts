import { createApp } from 'vue';
import App from './App.vue';
import { installTicketsRemote } from './app/bootstrap';

const app = createApp(App);

installTicketsRemote(app);
app.mount('#app');
