import { createPinia } from 'pinia';
import { getMainStore } from './main.js';

const pinia = createPinia();

export { getMainStore };
export default pinia;