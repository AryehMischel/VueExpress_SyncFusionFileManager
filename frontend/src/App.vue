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
      @fileOpen="(args) => onFileOpen(args)"
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
  onFileOpen,
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

  // // Three.js setup
  // const scene = new THREE.Scene();
  //   const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  //   const renderer = new THREE.WebGLRenderer();
  //   renderer.setSize(window.innerWidth, window.innerHeight);
  //   document.getElementById('canvas-container').appendChild(renderer.domElement);

  //   const geometry = new THREE.BoxGeometry();
  //   const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  //   const cube = new THREE.Mesh(geometry, material);
  //   scene.add(cube);

  //   camera.position.z = 5;

  //   const animate = function () {
  //     requestAnimationFrame(animate);

  //     cube.rotation.x += 0.01;
  //     cube.rotation.y += 0.01;

  //     renderer.render(scene, camera);
  //   };

  //   animate();

  //   // Handle window resize
  //   window.addEventListener('resize', () => {
  //     camera.aspect = window.innerWidth / window.innerHeight;
  //     camera.updateProjectionMatrix();
  //     renderer.setSize(window.innerWidth, window.innerHeight);
  //   });
});
</script>

<style src="./App.css"></style>

<style>
/* #app {
  /* position: relative;
  width: 100%;
  height: 100%; */
/* overflow: hidden; */
/* } */

#canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}

/* #file-manager {
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

/*} */
</style>
