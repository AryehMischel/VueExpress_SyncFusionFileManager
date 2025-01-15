import { defineStore } from 'pinia';
import isVRDevice from '../utils/vrUtils.js'; // Ensure this path is correct
import { get } from 'jquery';


let storeInstance;

export const useMainStore = defineStore('main', {
  state: () => ({
    isVR: false,
    userAgent: navigator.userAgent,
    supportsASTC: false,
    supportsETC: false,
    isImmersiveSession: false,
    currentWorkingDirectory: "",
    progressValues: {},
    processImagesInBrowserSetting: false,
    processClientSide: false,
    // Add other global state properties here
  }),
  actions: {
    setVRMode(vrCheck) {
      this.isVR = vrCheck;
    },
    checkVRDevice() {
        const check = isVRDevice();
        this.setVRMode(check); // Use the action to set the state
    },
    setASTC() {
      this.supportsASTC = true;
    },
    setETC() {
      this.supportsETC = true;
    },
    setImmersiveSession(isSessionBool) {
      this.isImmersiveSession = isSessionBool;
    },
    setWorkingDirectory(path) {
      this.currentWorkingDirectory = path;
    },
    updateProgress(id, value) {
      this.progressValues[id] = value;
    },
    removeProgress(id) {
      delete this.progressValues[id];
    }, 
    setProcessClientSide(value) {
      this.processClientSide = value;
    }

    // Add other actions here
  },
  getters: {
    getIsVR: (state) => state.isVR,
    userAgent: (state) => state.userAgent,
    getSupportsASTC: (state) => state.supportsASTC,
    getSupportsETC: (state) => state.supportsETC,
    getImmersiveSession: (state) => state.isImmersiveSession,
    getWorkingDirectory: (state) => state.currentWorkingDirectory,
    getProgressValues: (state) => state.progressValues,
    isFileLoading: (state) => (id) => {
      return state.progressValues[id] > 0 && state.progressValues[id] < 100;
    },
    getProcessClientSide: (state) => state.processClientSide,
   
    // Add other getters here
  }
});

export function getMainStore() {
  if (!storeInstance) {
    storeInstance = useMainStore();
  }
  return storeInstance;
}