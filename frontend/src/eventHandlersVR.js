import { uploadFileInfo, getPresignedUrl } from "./services/apiService.js";
import { processImage, addImage } from "./workers/workerManager.js";
import { getMainStore } from "./store/main";
import imageManager from "./three/managers/ImageManager.js";
import Logger from "./utils/logger.js";

const logger = new Logger("VR_Events", true);
let store;

export const onCreated = async (args) => {
  store = getMainStore();
  logger.log("on create for non VR", store.isVR);
};

export const onBeforeSend = async (args, fileManagerRef) => {
  console.log("onBeforeSend VR");
  if (args.action === "Upload") {
    const fileInput = document.querySelector("#file-manager_upload");
    logger.log("File input element:", fileInput);
    const file = fileInput.files[0];
    logger.log("File:", file);
    args.cancel = true; // Prevent the default upload behavior

    const data = JSON.parse(args.ajaxSettings.data);
    const fileInfo = data.find((item) => item.filename);
    const path = data[0].path;

    if (fileInfo) {
      const { filename, size } = fileInfo;
      const fileExtension = filename.split(".").pop();
      let clientImageId = generateUniqueId();

      addImage(clientImageId, {
        file: file,
        fileType: file.type,
        fileExtension: fileExtension,
      });

      logger.log("Uploading file:", filename, "to path:", path);
      try {
        // Step 1: Save file info to the server
        const response = await uploadFileInfo({
          name: filename,
          path: path,
          size: size,
          dateModified: new Date().toISOString(),
          dateCreated: new Date().toISOString(),
        });
        //sanitize and validate input
        logger.log(file, response.files[0].id, clientImageId);
        try {
          processImage(file, response.files[0].id, clientImageId);
        } catch (err) {
          logger.log("Error processing image:", err);
        }

        //sanitize and validate input
        // processImage(file, response.data.files[0].id, clientImageId);
      } catch (error) {
        logger.log("Error saving file info:", error);
        if (error.response && error.response.status === 409) {
          logger.log("File already exists");
        } else {
        }
      }
      // Step 5: Refresh the file manager
      // Step 5: Update the ajaxSettings data
      args.ajaxSettings.data = JSON.stringify({
        customName: filename,
        customPath: path,
        customSize: size,
        customType: "na", // fileType,
        customDateModified: new Date().toISOString(),
        customDateCreated: new Date().toISOString(),
      });

      // Step 6: Refresh the file manager
      refreshFileManager();
    }
  }

  if (args.action === "read") {
    // Example: Modify the request data
    if (args.ajaxSettings.data) {
      const requestData = JSON.parse(args.ajaxSettings.data);
      requestData.requestedFormat = "astc_4x4";
      args.ajaxSettings.data = JSON.stringify(requestData);
    }
    // args.ajaxSettings.data = JSON.stringify({"message from frontend": "any message really"});
    // eventLogger.log("requesting images from server...");
  }
};

export const onSuccess = async (args, state) => {
  if (args.action === "read") {
    logger.log("read results VR");
    for (let i = 0; i < args.result.files.length; i++) {
      const file = args.result.files[i];
      
      if (file.isFile) {
        const hasTexture = imageManager.images?.[file.groupId]?.texture;
        const hasCompressedTexture = imageManager.images?.[file.groupId]?.compressedTexture;
    
        if (!hasTexture && !hasCompressedTexture && file.processed) {
          imageManager.createImageObjects(file);
        }
      }
    }

    if (args.result && args.result.cwd && args.result.cwd.name) {
      logger.log("current path", args.result.cwd.name);
      store.setWorkingDirectory(args.result.cwd.name);
      state.currentPath = args.result.cwd.name;
      window.currentPath = state.currentPath;
    } else {
      logger.error("Unexpected response structure:", args.result);
    }

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 1 second
    setBreadCrumb();
    SET_TOOLBAR();
  }
};

export const onFileOpen = (args) => {
  logger.log("file opened");
};

export const onFailure = (args) => {
  logger.error("Failure:", args);
  if (args.error) {
    if (args.error.response) {
      logger.error("Error response:", args.error.response);
      if (args.error.response.status) {
        logger.error("Error status:", args.error.response.status);
      } else {
        logger.error("Error response does not contain status");
      }
    } else {
      logger.error("Error does not contain response");
    }
  } else {
    logger.error("Unexpected error structure:", args);
  }
};

export const onBeforePopupOpen = (args) => {
  if (args.popupName === "Upload") {
    args.cancel = true;
  }
};

export const onFileLoad = async (args) => {
  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 1 second

  let rowGroup = await getRowGroup();
  let element = args.element;

  rowGroup.appendChild(args.element);

  if (args.fileDetails.isFile) {
    args.element.setAttribute("data-image-id", args.fileDetails.groupId);
    let hasTexture = imageManager.images?.[args.fileDetails.groupId]?.texture;
    let hasCompressedTexture = imageManager.images?.[args.fileDetails.groupId]?.compressedTexture;
    if(hasTexture || hasCompressedTexture){
      const defaultSpan = args.element.querySelector("#defaultSpan");
      if (defaultSpan) {
        defaultSpan.innerHTML = "✔️";
      } else {
        console.warn("Element with id 'defaultSpan' not found");
      }
    }


    //html ui element
    const targetElement = element.children[0];

    element.addEventListener("click", (event) => {
      imageManager.selectImage(`${args.fileDetails.groupId}`);

      // Create and dispatch mousedown event
      const mouseDownEvent = new MouseEvent("mousedown", {
        view: window,
        bubbles: true,
        cancelable: true,
      });

      document.body.dispatchEvent(mouseDownEvent);

      // Create and dispatch mouseup event
      const mouseUpEvent = new MouseEvent("mouseup", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(mouseUpEvent);

      // Create and dispatch click event
      targetElement.click();
    });
  } else {
    //folders

    element.addEventListener("click", (event) => {
      const targetElement = element.children[0];

      // Create and dispatch mousedown event
      const mouseDownEvent = new MouseEvent("mousedown", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(mouseDownEvent);

      // Create and dispatch mouseup event
      const mouseUpEvent = new MouseEvent("mouseup", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(mouseUpEvent);

      // Create and dispatch click event
      targetElement.click();

      let selectedUI = getSelectedUI();
      logger.log("selectedUI", selectedUI);

      if (selectedUI === store.previouslySelectedItem) {
        openFile(selectedUI);
      } else {
        store.previouslySelectedItem = selectedUI;
      }
    });
  }
};

const generateUniqueId = () => {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
};
