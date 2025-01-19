<template>
  <div id="app">
    <div v-if="isInitialized">
      <ejs-filemanager
        id="file-manager"
        ref="fileManagerRef"
        :ajaxSettings="state.ajaxSettings"
        :contextMenuSettings="contextMenuSettings"
        :toolbarSettings="state.toolbarSettings"
        :view="view"
        :breadcrumbBarSettings="breadcrumbBarSettings"
        :detailsViewSettings="state.detailsViewSettings"
        :allowDragAndDrop="true"
        :uploadSettings="uploadSettings"
        @toolbarClick="(args) => onToolbarClick(args)"
        @fileOpen="(args) => eventHandlers.onFileOpen(args)"
        @beforeSend="(args) => eventHandlers.onBeforeSend(args, fileManagerRef)"
        @success="(args) => eventHandlers.onSuccess(args, state)"
        @failure="(args) => eventHandlers.onFailure(args)"
        @beforePopupOpen="(args) => eventHandlers.onBeforePopupOpen(args)"
        @fileLoad="(args) => eventHandlers.onFileLoad(args)"
        @created="(args) => eventHandlers.onCreated(args)"
      ></ejs-filemanager>
      <div id="dynamic-container"></div>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  provide,
  nextTick,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { createApp, h } from "vue";
import {
  FileManagerComponent as EjsFilemanager,
  DetailsView,
  BreadCrumbBar,
  Toolbar,
} from "@syncfusion/ej2-vue-filemanager";

// import { ProgressBarComponent as EjsProgressbar } from "@syncfusion/ej2-vue-progressbar";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  ProgressBarComponent as EjsProgressbar,
  ProgressBarPlugin,
} from "@syncfusion/ej2-vue-progressbar";
import { createWebWorkers } from "./workers/workerManager.js";
import { getMainStore } from "./store/main";
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

import {
  detailsViewSettings as detailsViewSettingsVR,
  toolbarSettings as toolbarSettingsVR,
} from "./fileManagerSettingsVR.js";

import {
  detailsViewSettings as detailsViewSettingsVRAlbum,
  toolbarSettings as toolbarSettingsVRAlbum,
} from "./albumFileManagerSettingsVR.js";

import {
  ajaxSettings as ajaxSettingsAlbum,
  toolbarSettings as toolbarSettingsAlbum,
  contextMenuSettings as contextMenuSettingsAlbum,
  view as viewSettingsAlbum,
  detailsViewSettings as detailsViewSettingsAlbum,
  breadcrumbBarSettings as breadcrumbBarSettingsAlbum,
  uploadSettings as uploadSettingsAlbum,
} from "./albumFileManagerSettings.js";

import Logger from "./utils/logger";

const fileManagerRef = ref(null);
const isInitialized = ref(false);
const route = useRoute(); //
const fullPath = computed(() => route.fullPath);

const onToolbarClick = (args) => {
  console.log(args);
  if (args.item.properties.text === "customButton") {
    console.log("Custom button clicked");
  }
};

const state = reactive({
  ajaxSettings: {},
  contextMenuSettings: {},
  toolbarSettings: {},
  view: "Details",
  breadcrumbBarSettings: {},
  detailsViewSettings: {},
  uploadSettings: {},
});

provide("filemanager", [DetailsView, BreadCrumbBar, Toolbar]);
let store;
let logger;
const initializeApp = async () => {
  state.ajaxSettings = ajaxSettings;
  state.contextMenuSettings = contextMenuSettings;
  state.breadcrumbBarSettings = breadcrumbBarSettings;
  state.uploadSettings = uploadSettings;
  await store.checkVRDevice();
  //get vr state
  let vrState = store.getIsVR;
  console.log(`VR state: ${vrState}`);
  if (vrState) {
    state.detailsViewSettings = detailsViewSettingsVR;
    state.toolbarSettings = toolbarSettingsVR;
  } else {
    state.detailsViewSettings = detailsViewSettings;
    state.toolbarSettings = toolbarSettings;
  }

  isInitialized.value = true;
};

const attachProgressBar = (target, id) => {
  nextTick(() => {
    console.log(`Attaching progress bar to target with id: ${id}`);
    const app = createApp({
      render() {
        return h(EjsProgressbar, {
          type: "Linear",
          height: "20px",
          width: "100px",
          value: store.getProgressValues[id] ?? 0, // Use reactive state
        });
      },
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
  logger = new Logger("Ape Logger")
  store = getMainStore();
  // await initializeApp();
  watch(
    fullPath,
    async (newPath) => {
      if (newPath.startsWith("/albums/")) {
        console.log("its an album")
        if (!store.getIsAlbum) {
          console.log("reset all ui")
          store.setAlbum(true);
          state.ajaxSettings = ajaxSettingsAlbum;
          state.contextMenuSettings = contextMenuSettingsAlbum;
          state.breadcrumbBarSettings = breadcrumbBarSettingsAlbum;
          state.uploadSettings = uploadSettingsAlbum;
          state.detailsViewSettings = detailsViewSettingsAlbum;
          state.toolbarSettings = toolbarSettingsAlbum;
          await store.checkVRDevice();
          let vrState = store.getIsVR;
          if (vrState) {
            if (vrState) {
              state.detailsViewSettings = detailsViewSettingsVRAlbum;
              state.toolbarSettings = toolbarSettingsVRAlbum;
            } else {
              state.detailsViewSettings = detailsViewSettingsAlbum;
              state.toolbarSettings = toolbarSettingsAlbum;
            }
          }
          isInitialized.value = true;
        }
      } else {
        console.log("it is certainly not an album")
        if (store.getIsAlbum) {
          store.setAlbum(false);
        }

        await initializeApp();
      }
    },
    { immediate: true }
  );

  initializeScene();
  createWebWorkers();
  const fileManagerInstance = fileManagerRef.value?.ej2Instances;
  window.fileManagerInstance = fileManagerInstance;
  if (fileManagerInstance) {
    window.refreshFileManager = () => {
      fileManagerInstance.refreshFiles();
    };
    window.refreshLayout = () => {
      fileManagerInstance.refreshLayout();
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
@import "https://cdn.syncfusion.com/ej2/27.1.48/fabric-dark.css";

/* Override Syncfusion styles */
.e-grid .e-gridheader {
  background-color: #dc0000;
  color: #fff;
  border-bottom-color: #785dc8;
  border-top-color: #785dc8;
}

/* Make the grid semi-transparent */
.e-grid {
  opacity: 0.8;
  /* Adjust the opacity value as needed */
}
</style>
