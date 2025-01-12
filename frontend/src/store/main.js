import { defineStore } from 'pinia';
import isVRDevice from '../utils/vrUtils.js'; // Ensure this path is correct


let storeInstance;

export const useMainStore = defineStore('main', {
  state: () => ({
    isVR: false,
    userAgent: navigator.userAgent,
    supportsASTC: false,
    supportsETC: false,
    // Add other global state properties here
  }),
  actions: {
    setVRMode(vrCheck) {
      this.isVR = vrCheck;
    },
    checkVRDevice() {
        // this.count++;
        //console.log('this in checkVRDevice:', this);
        const check = isVRDevice();
        this.setVRMode(check); // Use the action to set the state
    },
    // Add other actions here
  },
  getters: {
    getIsVR: (state) => state.isVR,
    userAgent: (state) => state.userAgent,
    supportsASTC: (state) => state.supportsASTC,
    supportsETC: (state) => state.supportsETC,
    // Add other getters here
  }
});

export function getMainStore() {
  if (!storeInstance) {
    storeInstance = useMainStore();
  }
  return storeInstance;
}