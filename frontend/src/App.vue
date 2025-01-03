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

//image processing
var imageQueue = [];

//initialize the worker pool
const workerCount = 4;
const workers = [];
const workerStatus = new Array(workerCount).fill(false); // Track worker availability
const messageQueue = [];
let currFile;
let currFileType;
function createWebWorkers() {
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./workers/worker.js", import.meta.url));
    worker.onmessage = async function (e) {
      // console.log("worker response: ", e.data);

      // Handle the worker response
      if (e.data.jobCompleted === "detect_360_Format") {
        if (e.data.format === "equirectangular") {
          handleEqrt(e);
        }
      }

      workerStatus[i] = false;
    };

    workers.push(worker);
  }
}

async function handleEqrt(e) {
  console.log("image file type from web worker", e.data.imageFileType);
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"];
  const fileExtension = currFileType.split("/").pop().toLowerCase();
  if (imageExtensions.includes(fileExtension)) {
    console.log("Image file type detected:", fileExtension);
  } else {
    console.log("Non-image file type detected:", fileExtension);
  }
  // Save the format to the database
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
        faceCount: 1,
        fileExtension: fileExtension,
      }
    );

    // console.log("myFuckingFileType", currFile.type);
    // upload the image faces to S3 using presigned urls
    const res = await fetch(response.data.files[0].urls[0], {
      method: "PUT",
      headers: {
        "Content-Type": e.data.imageFileType,
      },
      body: currFile,
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

window.createWebWorkers = createWebWorkers;

// Event handlers
const onBeforeSend = async (args) => {
  // console.log("Before Send:", args);

  if (args.action === "Upload") {
    // Find the file input element in the DOM
    const fileInput = document.querySelector("#file-manager_upload");
    const file = fileInput.files[0];
    currFile = file;
    console.log("currFile type", currFile.type);
    //currFileType = file.type.split("/").pop();
    // console.log("file type", currFileType);
    // console.log("file", file);

    // console.log("Uploading file:", args);
    args.cancel = true; // Prevent the default upload behavior

    // sanitize input

    const data = JSON.parse(args.ajaxSettings.data);
    // console.log("data unparsed", args.ajaxSettings);
    let ajaxData = args.ajaxSettings;
    window.ajaxData = ajaxData;
    let ajaxDataParsed = ajaxData.data;
    // console.log("data parsed", ajaxDataParsed);
    window.ajaxDataParsed = ajaxDataParsed;
    const fileInfo = data.find((item) => item.filename);
    const path = data[0].path;

    if (fileInfo) {
      const { filename, size } = fileInfo;
      const fileType = filename.split(".").pop();
      console.log("file type", fileType);
      currFileType = fileType

      try {
        // Save file information to the tempFiles table
        const response = await axios.post(
          "http://localhost:3000/api/filemanager/upload",
          {
            name: filename,
            path: path, // Use the current path
            size: size,
            type: fileType,
            dateModified: new Date().toISOString(),
            dateCreated: new Date().toISOString(),
          }
        );

        // console.log("File saved:", response.data.files[0]);
        // console.log(
        //   "detected format for image ",
        //   response.data.files[0].name,
        //   " of id ",
        //   response.data.files[0].id
        // );

        // response.data.files[0].name,
        try {
          processImage(file, response.data.files[0].id);
        } catch (err) {
          console.log("error processing image", err);
        }
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

        // Process the file
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
  // console.log("FileManager instance:", fileManagerInstance);
  if (fileManagerInstance) {
    window.refreshFileManager = () => {
      fileManagerInstance.refreshFiles();
    };
  } else {
    console.error("FileManager instance not found");
  }
});

// Process the image
function processImage(file, id) {
  const availableWorkerIndex = workerStatus.findIndex((status) => !status);
  if (availableWorkerIndex !== -1) {
    console.log("worker is available");
    workerStatus[availableWorkerIndex] = true; // Mark the worker as busy
    workers[availableWorkerIndex].postMessage({ file, id });
  }
}
</script>

<style src="./App.css"></style>
