import { defineStore } from 'pinia';
import isVRDevice from '../utils/vrUtils.js'; // Ensure this path is correct

export const useMainStore = defineStore('main', {
  state: () => ({
    isVR: false,
    userAgent: navigator.userAgent,
    // Add other global state properties here
  }),
  actions: {
    setVRMode(isVR) {
      this.isVR = isVR;
    },
    async checkVRDevice() {
      const isVR = await isVRDevice();
      this.setVRMode(isVR); // Use the action to set the state
    },
    // Add other actions here
  },
  getters: {
    isVR: (state) => state.isVR,
    userAgent: (state) => state.userAgent,
    // Add other getters here
  }
});