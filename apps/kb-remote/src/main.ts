// apps/kb-remote/src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { installKbRemote } from './app/bootstrap';

const app = createApp(App);

installKbRemote(app);
app.mount('#app');
