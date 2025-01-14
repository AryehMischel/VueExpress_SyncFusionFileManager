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
        @beforeSend="(args) => eventHandlers.onBeforeSend(args, fileManagerRef)"
        @success="(args) => eventHandlers.onSuccess(args, state)"
        @failure="(args) => eventHandlers.onFailure(args)"
        @beforePopupOpen="(args) => eventHandlers.onBeforePopupOpen(args)"
        @fileLoad="(args) => eventHandlers.onFileLoad(args)"
        @created="(args) => eventHandlers.onCreated(args)"
      ></ejs-filemanager>
      <div class="progress-bar-container">
      <ejs-progressbar
        id="test-progress-bar"
        :type="'Linear'"
        :height="'20px'"
        :width="'100px'"
        :value="50"
      ></ejs-progressbar>
    </div>
    <div id="dynamic-container"></div>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>




<script setup>
import { ref, reactive, computed, onMounted, provide, nextTick } from "vue";
import { createApp, h } from 'vue';
import {
  FileManagerComponent as EjsFilemanager,
  DetailsView,
  BreadCrumbBar,
  Toolbar,
} from "@syncfusion/ej2-vue-filemanager";

// import { ProgressBarComponent as EjsProgressbar } from "@syncfusion/ej2-vue-progressbar";
import { registerLicense } from "@syncfusion/ej2-base";
import { ProgressBarComponent as EjsProgressbar, ProgressBarPlugin } from "@syncfusion/ej2-vue-progressbar";

//"Ngo9BigBOggjHTQxAR8/V1NMaF5cXmBCf0x3TXxbf1x1ZFREal1STnNfUj0eQnxTdEFiW35XcXZURWVZUUB0Ww=="
 
import { createWebWorkers } from "./workers/workerManager.js";
import { getMainStore } from './store/main';
import * as nonVREventHandlers from "./eventHandlers.js";
import * as VREventHandlers from "./eventHandlersVR.js";

import {
  ajaxSettings,
  toolbarSettings,
  contextMenuSettings,
  view,
  detailsViewSettings,
  breadcrumbBarSettings,
  uploadSettings,
} from "./fileManagerSettings.js";
import { logger } from "sequelize/lib/utils/logger";


const fileManagerRef = ref(null);
const isInitialized = ref(false);

const state = reactive({
  ajaxSettings: {},
  contextMenuSettings: {},
  toolbarSettings: {},
  view: 'Details',
  breadcrumbBarSettings: {},
  detailsViewSettings: {},
  uploadSettings: {},
});

provide("filemanager", [DetailsView, BreadCrumbBar, Toolbar]);
let store;



const initializeApp = async () => {
  // await new Promise(resolve => setTimeout(resolve, 2000));
  state.ajaxSettings = ajaxSettings;
  state.contextMenuSettings = contextMenuSettings;
  state.breadcrumbBarSettings = breadcrumbBarSettings;
  state.detailsViewSettings = detailsViewSettings;
  state.uploadSettings = uploadSettings;
  await store.checkVRDevice();
  isInitialized.value = true;
};

function initializeProgressBars(){
  console.log("Initializing progress bars");
  const progressBars = document.querySelectorAll('.progress-bar');
  progressBars.forEach((bar) => {
    console.log("bar: ", bar);
    // const value = parseInt(bar.getAttribute('data-value'), 10);
    // new EjsProgressbar({
    //   type: 'Linear',
    //   height: '20px',
    //   width: '100px',
    //   value: 20,
    // }).appendTo(bar);
  });
};


const attachProgressBar = (target, id) => {
  nextTick(() => {
    console.log(`Attaching progress bar to target with id: ${id}`);
    const app = createApp({
      render() {
        return h(EjsProgressbar, {
          type: 'Linear',
          height: '20px',
          width: '100px',
          value: store.getProgressValues[id] ?? 0,// Use reactive state
        });
      }
    });
    app.use(ProgressBarPlugin);
    app.mount(target);
  });
};

const detachProgressBar = (target) => {
  if (target.__vue_app__) {
    target.__vue_app__.unmount();
    delete target.__vue_app__;
  }
  target.remove();
};

window.attachProgressBar = attachProgressBar;
window.detachProgressBar = detachProgressBar;


registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

onMounted(async () => {
  store = getMainStore();
  await initializeApp();
  initializeScene();
  createWebWorkers();
  const fileManagerInstance = fileManagerRef.value?.ej2Instances;
  window.fileManagerInstance = fileManagerInstance;
  initializeProgressBars();
  if (fileManagerInstance) {

    window.refreshFileManager = () => {
      fileManagerInstance.refreshFiles();
      initializeProgressBars();

    };
    window.refreshLayout = () => {
      fileManagerInstance.refreshLayout();
      initializeProgressBars();
    };
    window.getSelectedUI = () => {
      let selectedObj = fileManagerInstance.getSelectedFiles();
      if (selectedObj && selectedObj.length > 0 && selectedObj[0]) {
        return selectedObj[0].name;
      } else {
        logger.warn("No file selected or file object is undefined");
        return null;
      }
    };

    window.createFolder = () => {
      fileManagerInstance.createFolder("test");
    };
    window.getLocalData = () => {
      logger.log(fileManagerInstance.getLocalData());
    };
    window.openFile = (id) => {
      fileManagerInstance.openFile(id);
    };
  } else {
    logger.error("FileManager instance not found");
  }



});

const isVR = computed(() => store.isVR);
const userAgent = computed(() => store.userAgent);
const eventHandlers = computed(() => {
  return isVR.value ? VREventHandlers : nonVREventHandlers;
});

const fileManagerSettings = computed(() => {
  if (isVR.value) {
    return {
      // VR-specific settings
    };
  } else {
    return {
      toolbarSettings: toolbarSettings,
    };
  }
});
</script>

<style>
@import "https://cdn.syncfusion.com/ej2/27.1.48/fabric-dark.css";</style>

