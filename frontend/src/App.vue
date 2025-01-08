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
      @beforeSend="(args) => onBeforeSend(args, fileManagerRef)"
      @success="(args) => onSuccess(args, state)"
      @failure="(args) => onFailure(args)"
      @beforePopupOpen="(args) => onBeforePopupOpen(args)"
      @fileLoad="(args) => onFileLoad(args)"
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
import {
  onBeforeSend,
  onBeforePopupOpen,
  onFileLoad,
  onSuccess,
  onFailure,
} from "./eventHandlers";
import { createWebWorkers } from "./workers/workerManager";
import {
  ajaxSettings,
  toolbarSettings,
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

onMounted(() => {
  createWebWorkers();
  const fileManagerInstance = fileManagerRef.value?.ej2Instances;
  window.fileManagerInstance = fileManagerInstance;
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