import { createPinia } from 'pinia';
import { useMainStore } from './main';

const pinia = createPinia();

export { useMainStore };
export default pinia;