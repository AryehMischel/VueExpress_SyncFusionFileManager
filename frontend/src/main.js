import { createApp } from 'vue';
import App from './App.vue';
import store from './store';
import './style.css';
// Import jQuery and jQuery UI
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';

// Make jQuery available globally
window.$ = $;
window.jQuery = $;
createApp(App)
  .use(store)
  .mount('#app');