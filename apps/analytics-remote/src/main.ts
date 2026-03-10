import { createApp } from 'vue';
import App from './App.vue';
import { installAnalyticsRemote } from './app/bootstrap';

const app = createApp(App);

installAnalyticsRemote(app);
app.mount('#app');
