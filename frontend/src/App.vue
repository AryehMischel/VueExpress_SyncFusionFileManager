<template>
  <!-- <div id="canvas-container"></div> -->
  <div id="app">
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
    ></ejs-filemanager>
  </div>
</template>

<script setup>
import { provide, onMounted, ref, reactive } from "vue";
import {
  FileManagerComponent as EjsFilemanager,
  DetailsView,
  BreadCrumbBar,
  Toolbar,
} from "@syncfusion/ej2-vue-filemanager";
import { registerLicense } from "@syncfusion/ej2-base";
console.log("user aganet", navigator.userAgent)
import { isVRDevice } from "./utils/utility.js";

// Use the appropriate event handlers
import * as VREventHandlers from "./eventHandlersVR";
import * as nonVREventHandlers from "./eventHandlers";

// Import toolbar settings
import { toolbarSettings as nonVRToolbarSettings } from "./fileManagerSettings";
import { toolbarSettings as VRToolbarSettings } from "./fileManagerSettingsVR";
const toolbarSettings = ref(nonVRToolbarSettings);

const eventHandlers = ref({
  onBeforeSend: nonVREventHandlers.onBeforeSend,
  onBeforePopupOpen: nonVREventHandlers.onBeforePopupOpen,
  onFileLoad: nonVREventHandlers.onFileLoad,
  onSuccess: nonVREventHandlers.onSuccess,
  onFailure: nonVREventHandlers.onFailure,
  onFileOpen: nonVREventHandlers.onFileOpen,
});

import { createWebWorkers } from "./workers/workerManager";
import {
  ajaxSettings,
  // toolbarSettings,
  contextMenuSettings,
  view,
  detailsViewSettings,
  breadcrumbBarSettings,
  uploadSettings,
} from "./fileManagerSettings";

registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1NMaF5cXmBCf0x3TXxbf1x1ZFREal1STnNfUj0eQnxTdEFiW35XcXZURWVZUUB0Ww=="
);

provide("filemanager", [DetailsView, BreadCrumbBar, Toolbar]);

const fileManagerRef = ref(null);
const state = reactive({
  currentPath: "/",
});

onMounted(async () => {
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
    window.getSelectedShit = () => {
      let selectedObj = fileManagerInstance.getSelectedFiles();
      if (selectedObj && selectedObj.length > 0 && selectedObj[0]) {
        return selectedObj[0].name;
      } else {
        console.warn("No file selected or file object is undefined");
        return null;
      }
    };

    window.createFolder = () => {
      fileManagerInstance.createFolder("test");
    };
    window.getLocalData = () => {
      console.log(fileManagerInstance.getLocalData());
    };
    window.openFile = (id) => {
      fileManagerInstance.openFile(id);
    };
  } else {
    console.error("FileManager instance not found");
  }
  if(await isVRDevice()){
    console.log("VR Device")

    //set event handlers for VR
    eventHandlers.value.onBeforeSend = VREventHandlers.onBeforeSend;
    eventHandlers.value.onBeforePopupOpen = VREventHandlers.onBeforePopupOpen;
    eventHandlers.value.onFileLoad = VREventHandlers.onFileLoad;
    eventHandlers.value.onSuccess = VREventHandlers.onSuccess;
    eventHandlers.value.onFailure = VREventHandlers.onFailure;
    eventHandlers.value.onFileOpen = VREventHandlers.onFileOpen;

    //set toolbar settings for VR
    toolbarSettings.value = VRToolbarSettings;

    console.log("VR Device");
  }else{
    console.log("Not VR Device")
  }


});
</script>

<style src="./App.css"></style>

<style>
/* 
#app {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}

#file-manager {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 300px;
  height: 400px;
  z-index: 1;
  background: rgba(
    255,
    255,
    255,
    0.9
  ); /* Optional: Add a background to make it more readable */
/*}*/

</style>
