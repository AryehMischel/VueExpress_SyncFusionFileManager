<template>
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
      @beforeSend="onBeforeSend"
      @success="onSuccess"
      @failure="onFailure"
      @beforePopupOpen="onBeforePopupOpen"
    ></ejs-filemanager>
  </div>
</template>

<script setup>
import { provide, onMounted, ref, reactive } from "vue";

import axios from "axios";
import {
  FileManagerComponent as EjsFilemanager,
  DetailsView,
  BreadCrumbBar,
  Toolbar,
} from "@syncfusion/ej2-vue-filemanager";
import { registerLicense } from "@syncfusion/ej2-base";
registerLicense("Ngo9BigBOggjHTQxAR8/V1NMaF5cXmBCf0x3TXxbf1x1ZFREal1STnNfUj0eQnxTdEFiW35XcXZURWVZUUB0Ww==");

//import settings for syncfusion file manager
import {
  ajaxSettings,
  toolbarSettings,
  contextMenuSettings,
  view,
  detailsViewSettings,
  breadcrumbBarSettings,
  uploadSettings,
} from "./fileManagerSettings";

// Provide Syncfusion components
provide("filemanager", [DetailsView, BreadCrumbBar, Toolbar]);


// Reactive state... not really using this atm
const fileManagerRef = ref(null);
const state = reactive({
  currentPath: "/",
});




// Event handlers
const onBeforeSend = async (args) => {
  console.log("Before Send:", args);

  if (args.action === "Upload") {
    args.cancel = true; // Prevent the default upload behavior

    const data = JSON.parse(args.ajaxSettings.data);
    const fileInfo = data.find((item) => item.filename);
    const path = data[0].path;


    if (fileInfo) {
      const { filename, size } = fileInfo;
      const fileType = filename.split(".").pop();

      try {

        // Save file information to the tempFiles table
        await axios.post("http://localhost:3000/api/filemanager/upload", {
          name: filename,
          path: path, // Use the current path
          size: size,
          type: fileType,
          dateModified: new Date().toISOString(),
          dateCreated: new Date().toISOString(),
        });

        // Customize the ajaxSettings to send custom arguments
        args.ajaxSettings.data = JSON.stringify({
          customName: filename,
          customPath: path,
          customSize: size,
          customType: fileType,
          customDateModified: new Date().toISOString(),
          customDateCreated: new Date().toISOString(),
        });

        const fileManagerInstance = fileManagerRef.value?.ej2Instances;
        fileManagerInstance.refreshFiles();
      } catch (error) {
        if(error.response.status === 409){
          console.log("file already exists");
          console.log("prompt user to either overwrite or rename file");

        } 
        console.error("Error saving file info:", error);
      }
    }
  }
};


const onBeforePopupOpen = (args) => {
  // Check if the popup is for upload and cancel it
  if (args.popupName === "Upload") {
    args.cancel = true;
  }
};

const onSuccess = (args) => {
  state.currentPath = args.path;
};

const onFailure = (args) => {
  console.error("Failure:", args);
  console.error("Error details:", args.error);
};

// Lifecycle hook
onMounted(() => {
  const fileManagerInstance = fileManagerRef.value?.ej2Instances;
  if (fileManagerInstance) {
    window.refreshFileManager = () => {
      fileManagerInstance.refreshFiles();
    };
  } else {
    console.error("FileManager instance not found");
  }
});
</script>

<style src="./App.css"></style>
