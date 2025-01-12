import { createPinia } from 'pinia';
import { useMainStore } from './main.js';

const pinia = createPinia();

export { useMainStore };
export default pinia;