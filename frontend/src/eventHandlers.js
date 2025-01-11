import { uploadFileInfo, getPresignedUrl } from "./services/apiService.js";
import { imageManager, StateManager } from "./ThreeScene.js";
import { processImage, addImage } from "./workers/workerManager.js";
import Logger from "./utils/logger.js";

const eventLogger = new Logger("eventHandlers", true);

export const onBeforeSend = async (args, fileManagerRef) => {
  if (args.action === "read") {
    eventLogger.log("requesting images from server...", args);
    // Example: Modify the request data
    if (args.ajaxSettings.data) {

      if(ThreeStateManager){
        if(ThreeStateManager.isVR){
          const requestData = JSON.parse(args.ajaxSettings.data);
          requestData.customField = "CustomValue";
          args.ajaxSettings.data = JSON.stringify(requestData);
        }else{
          console.log("not VR");
        }
      }else{
        console.log("no stateManager");
      } 

    }
    // args.ajaxSettings.data = JSON.stringify({"message from frontend": "any message really"});
    // eventLogger.log("requesting images from server...");
  }

  if (args.action === "Upload") {
    const fileInput = document.querySelector("#file-manager_upload");
    eventLogger.log("File input element:", fileInput);
    const file = fileInput.files[0];
    eventLogger.log("File:", file);
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

      eventLogger.log("Uploading file:", filename, "to path:", path);
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
        eventLogger.log(file, response.files[0].id, clientImageId);
        try {
          processImage(file, response.files[0].id, clientImageId);
        } catch (err) {
          eventLogger.log("Error processing image:", err);
        }

        //sanitize and validate input
        // processImage(file, response.data.files[0].id, clientImageId);
      } catch (error) {
        eventLogger.log("Error saving file info:", error);
        if (error.response && error.response.status === 409) {
          eventLogger.log("File already exists");
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
    eventLogger.log("read results non VR:", args.result);

    for (let i = 0; i < args.result.files.length; i++) {
      const file = args.result.files[i];
      if (file.isFile) {
        eventLogger.log("File loaded:", file);
        if (file.processed) {
          imageManager.createImageObjects(file);
        } else {
          //grey out unprocessed images
        }
      }
    }

    if (args.result && args.result.cwd && args.result.cwd.name) {
      state.currentPath = args.result.cwd.name;
      window.currentPath = state.currentPath;
    } else {
      eventLogger.error("Unexpected response structure:", args.result);
    }
  }
};

export const onFileOpen = (args) => {};

export const onFailure = (args) => {
  eventLogger.error("Failure:", args);
  if (args.error) {
    if (args.error.response) {
      eventLogger.error("Error response:", args.error.response);
      if (args.error.response.status) {
        eventLogger.error("Error status:", args.error.response.status);
      } else {
        eventLogger.error("Error response does not contain status");
      }
    } else {
      eventLogger.error("Error does not contain response");
    }
  } else {
    eventLogger.error("Unexpected error structure:", args);
  }
};

export const onBeforePopupOpen = (args) => {
  if (args.popupName === "Upload") {
    args.cancel = true;
  }
};

export const onFileLoad = async (args) => {
  if (args.fileDetails.isFile) {
    eventLogger.log("File loaded:", args);

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
