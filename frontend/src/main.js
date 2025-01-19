import { createApp } from 'vue';
import App from './App.vue';
import Settings from './Settings.vue';
import router from './router/index.js'; // Import the router
import pinia from './store';
import './style.css';
// Import jQuery and jQuery UI
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';

// Make jQuery available globally
window.$ = $;
window.jQuery = $;
const app = createApp(App);
app.use(pinia);
app.use(router); //
app.mount('#app');

// Mount the settings bar
const settingsApp = createApp(Settings);
settingsApp.mount('#settings');