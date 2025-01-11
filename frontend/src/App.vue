<template>
  <div id="app">
    <div v-if="isInitialized">
      <ejs-filemanager
        id="file-manager"
        ref="fileManagerRef"
        :ajaxSettings="ajaxSettings"
        :contextMenuSettings="contextMenuSettings"
        :toolbarSettings="toolbarSettings"
        :view="view"
        :breadcrumbBarSettings="breadcrumbBarSettings"
        :detailsViewSettings="detailsViewSettings"
        :allowDragAndDrop="true"
        :uploadSettings="uploadSettings"
        @fileOpen="(args) => eventHandlers.onFileOpen(args)"
        @beforeSend="(args) => eventHandlers.onBeforeSend(args, $refs.fileManagerRef)"
        @success="(args) => eventHandlers.onSuccess(args, state)"
        @failure="(args) => eventHandlers.onFailure(args)"
        @beforePopupOpen="(args) => eventHandlers.onBeforePopupOpen(args)"
        @fileLoad="(args) => eventHandlers.onFileLoad(args)"
      ></ejs-filemanager>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script>
import { useMainStore } from './store/main';
import * as nonVREventHandlers from "./eventHandlers.js";

import {
  ajaxSettings,
  toolbarSettings,
  contextMenuSettings,
  view,
  detailsViewSettings,
  breadcrumbBarSettings,
  uploadSettings,
} from "./fileManagerSettings.js";


export default {
  setup() {
    const store = useMainStore();
    return { store };
  },
  data() {
    return {
      isInitialized: false,
      ajaxSettings: {},
      contextMenuSettings: {},
      toolbarSettings: {},
      view: 'Details',
      breadcrumbBarSettings: {},
      detailsViewSettings: {},
      uploadSettings: {},
    };
  },
  async created() {
    // Perform your initialization logic here
    await this.initializeApp();
    this.isInitialized = true;
  },
  methods: {
    async initializeApp() {
      // Simulate an async initialization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Initialize your settings here
      this.ajaxSettings = ajaxSettings;
      this.contextMenuSettings = contextMenuSettings;
      // this.toolbarSettings = { /* your settings */ };
      this.breadcrumbBarSettings = breadcrumbBarSettings;
      this.detailsViewSettings = detailsViewSettings;
      this.uploadSettings = uploadSettings;

      // Check if the device is a VR device
      await this.store.checkVRDevice();
    }
  },
  computed: {
    isVR() {
      return this.store.isVR;
    },
    userAgent() {
      return this.store.userAgent;
    },
    // Computed property to switch settings based on VR mode
    fileManagerSettings() {
      if (this.isVR) {
        return {
          // ajaxSettings: { /* VR-specific settings */ },
          // contextMenuSettings: { /* VR-specific settings */ },
          // toolbarSettings: { /* VR-specific settings */ },
          // view: 'LargeIcons', // Example: change view mode in VR
          // breadcrumbBarSettings: { /* VR-specific settings */ },
          // detailsViewSettings: { /* VR-specific settings */ },
          // uploadSettings: { /* VR-specific settings */ },
        };
      } else {
        return {
          // ajaxSettings: this.ajaxSettings,
          // contextMenuSettings: this.contextMenuSettings,
          toolbarSettings: toolbarSettings,
          // view: this.view,
          // breadcrumbBarSettings: this.breadcrumbBarSettings,
          // detailsViewSettings: this.detailsViewSettings,
          // uploadSettings: this.uploadSettings,
        };
      }
    }
  }
};
</script>