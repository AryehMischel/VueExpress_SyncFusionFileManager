import { uploadFileInfo, getPresignedUrl } from "./services/apiService.js";
import { imageManager, StateManager } from "./ThreeScene.js";
import { processImage, addImage } from "./workers/workerManager.js";
import Logger from "./utils/logger.js";
import { getMainStore } from "./store/main";

const logger = new Logger("eventHandlers", true);
let store;


export const onCreated = async (args) => {
  store = getMainStore();
  logger.log("on create for non VR ", !store.isVR);
}

export const onBeforeSend = async (args, fileManagerRef) => {
  if (args.action === "read") {
    logger.log("requesting images from server...", args);
    // Example: Modify the request data
    if (args.ajaxSettings.data) {
      const requestData = JSON.parse(args.ajaxSettings.data);
      requestData.requestedFormat = "img";
      args.ajaxSettings.data = JSON.stringify(requestData);
}
    // args.ajaxSettings.data = JSON.stringify({"message from frontend": "any message really"});
    // logger.log("requesting images from server...");
  }

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
};

export const onSuccess = async (args, state) => {
  if (args.action === "read") {
    logger.log("read results non VR:", args.result);

    for (let i = 0; i < args.result.files.length; i++) {
      const file = args.result.files[i];
      if (file.isFile) {
        logger.log("File loaded:", file);
        if (file.processed) {
          imageManager.createImageObjects(file);
        } else {
          //grey out unprocessed images
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
  }
};

export const onFileOpen = (args) => {};

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
  if (args.fileDetails.isFile) {
    logger.log("File loaded:", args);

    args.element.addEventListener("click", () => {
      imageManager.selectImage(`${args.fileDetails.groupId}`);
    });
  }

  // args.cancel = true;
  // args = {  };
  // // if (args.fileDetails.isFile) {
  // //   if (args.element.childNodes.length > 5) {
  // //     args.element.childNodes[5].classList.add("specialCase");
  // //   }
  // // }
};

const generateUniqueId = () => {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
};
