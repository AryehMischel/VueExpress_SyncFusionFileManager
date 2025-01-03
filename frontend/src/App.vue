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
      @fileLoad="onFileLoad"
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
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1NMaF5cXmBCf0x3TXxbf1x1ZFREal1STnNfUj0eQnxTdEFiW35XcXZURWVZUUB0Ww=="
);

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

// AKA Current Working Directory
const state = reactive({
  currentPath: "/",
});

//image files that need to be processed
var imageQueue = [];

//image files + metadata  (temp store while processing in service worker)
var images = {};

//initialize the worker pool
const workerCount = 4;
const workers = [];
const workerStatus = new Array(workerCount).fill(false); // Track worker availability
const messageQueue = [];

function createWebWorkers() {
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./workers/worker.js", import.meta.url));
    worker.onmessage = async function (e) {
      // Handle the worker response
      if (e.data.jobCompleted === "detect_360_Format") {
        if (e.data.format === "equirectangular") {
          handleEqrt(e);
        } else if (e.data.format === "cubemap") {
          handleStereoEqrt(e);
        }
      }

      workerStatus[i] = false;
    };

    workers.push(worker);
  }
}

async function handleEqrt(e) {
  // console.log("file is", images[e.data.clientImageId]);
  // console.log("image file type from web worker", e.data.imageFileType);
  // const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"];
  // const fileExtension = currFileType.split("/").pop().toLowerCase();
  // if (imageExtensions.includes(fileExtension)) {
  //   console.log("Image file type detected:", fileExtension);
  // } else {
  //   console.log("Non-image file type detected:", fileExtension);
  // }
  // // Save the format to the database

  console.log("file extension", images[e.data.clientImageId].fileExtension);
  console.log("file type", images[e.data.clientImageId].fileType);
  console.log("file", images[e.data.clientImageId].file);
  try {
    //update the image group with the determined format
    const response = await axios.patch(
      "http://localhost:3000/api/filemanager/image-group",
      {
        id: e.data.imageID,
        format: e.data.format,
      }
    );

    fileManagerInstance.refreshFiles();
  } catch (error) {
    console.error("Error saving format:", error);
  }

  try {
    // create image faces in image table, and grab presigned urls
    const response = await axios.post(
      "http://localhost:3000/api/filemanager/s3",
      {
        imageGroupId: e.data.imageID,
        height: e.data.height,
        width: e.data.width,
        faceCount: e.data.faceCount,
        fileExtension: images[e.data.clientImageId].fileExtension,
      }
    );

    // upload the image faces to S3 using presigned urls
    const res = await fetch(response.data.files[0].urls[0], {
      method: "PUT",
      headers: {
        "Content-Type": e.data.imageFileType,
      },
      body: images[e.data.clientImageId].file,
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    console.log("File uploaded successfully");
    //update the database
  } catch (error) {
    console.error("Error saving format:", error);
  }
}

async function handleStereoEqrt(e) {
  //update image group with determined format
  try {

    const response = await axios.patch(
      "http://localhost:3000/api/filemanager/image-group",
      {
        id: e.data.imageID,
        format: e.data.format,
      }
    );

    fileManagerInstance.refreshFiles();
  } catch (error) {
    console.error("Error saving format:", error);
  }

  //For now we will upload the source file as is. In the future we may want to crop the image into two faces here.

  //create image faces in image table, and grab presigned urls
  



  //upload the image faces to S3 using presigned urls
}

window.createWebWorkers = createWebWorkers;

// Event handlers
const onBeforeSend = async (args) => {
  // console.log("Before Send:", args);

  if (args.action === "Upload") {
    // Find the file input element in the DOM
    const fileInput = document.querySelector("#file-manager_upload");
    const file = fileInput.files[0];
    args.cancel = true; // Prevent the default upload behavior

    const data = JSON.parse(args.ajaxSettings.data);
    const fileInfo = data.find((item) => item.filename);
    const path = data[0].path;

    if (fileInfo) {
      const { filename, size } = fileInfo;
      const fileExtension = filename.split(".").pop();
      let clientImageId = generateUniqueId(); //unique id seperate
      images[clientImageId] = {
        file: file,
        fileType: file.type,
        fileExtension: fileExtension,
      }; //save file client side

      try {
        // Save basic file information in database
        const response = await axios.post(
          "http://localhost:3000/api/filemanager/upload",
          {
            name: filename,
            path: path, // Use the current path
            size: size,
            dateModified: new Date().toISOString(),
            dateCreated: new Date().toISOString(),
          }
        );

        try {
          //sanitize and validate input
          processImage(file, response.data.files[0].id, clientImageId);
        } catch (err) {
          console.log("error processing image", err);
        }

        // Customize the ajaxSettings to send back to file manager
        args.ajaxSettings.data = JSON.stringify({
          customName: filename,
          customPath: path,
          customSize: size,
          customType: "na", //fileType,
          customDateModified: new Date().toISOString(),
          customDateCreated: new Date().toISOString(),
        });

        const fileManagerInstance = fileManagerRef.value?.ej2Instances;
        fileManagerInstance.refreshFiles();
      } catch (error) {
        if (error.response.status === 409) {
          console.log("file already exists");
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

const onFileLoad = (args) => {
  // console.log("File loaded:", args);
  if (args.fileDetails.isFile) {
    if (args.element.childNodes.length > 5) {
      // console.log("file loaded is a file");
      args.element.childNodes[5].classList.add("specialCase"); // Add the new class
    } else {
      // console.log(args.element.children[0].children[2].classList.add("specialCase"));
    }
  }
};

const onSuccess = (args) => {
  // console.log("Success:", args);
  if (args.action === "read") {
    state.currentPath = args.result.cwd.name;
    window.currentPath = state.currentPath;
    // console.log("added mock image");

    // args.result.files.push({
    //   name: "MockImage.png",
    //   isFile: true,
    //   size: 1024, // Example size
    //   dateModified: new Date().toISOString(),
    //   type: "File",
    // });

    // const fileManagerInstance = fileManagerRef.value?.ej2Instances;
    //     if (fileManagerInstance) {
    //       fileManagerInstance.trigger('fileLoad', {
    //         name: "MockImage.png",
    //         isFile: true,
    //         size: 1024,
    //         dateModified: new Date().toISOString(),
    //         type: "File",
    //       });
    //     }
  }
};

const onFailure = (args) => {
  console.error("Failure:", args);
  console.error("Error details:", args.error);
};

// Lifecycle hook
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

// Process the image
function processImage(file, id, clientImageId) {
  const availableWorkerIndex = workerStatus.findIndex((status) => !status);
  if (availableWorkerIndex !== -1) {
    // console.log("worker is available");
    workerStatus[availableWorkerIndex] = true; // Mark the worker as busy
    workers[availableWorkerIndex].postMessage({ file, id, clientImageId });
  } else {
    // add file to work queue
  }
}

function generateUniqueId() {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}
</script>

<style src="./App.css"></style>
