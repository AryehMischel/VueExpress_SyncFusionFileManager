import { uploadFileInfo, getPresignedUrl } from "./services/apiService.js";
import { processImage, addImage } from "./workers/workerManager.js";

import Logger from './utils/logger.js';


const eventHandlersVRLogger = new Logger('VR_Events', true);



export const onBeforeSend = async (args, fileManagerRef) => {
  if (args.action === "Upload") {
    const fileInput = document.querySelector("#file-manager_upload");
    eventHandlersVRLogger.log("File input element:", fileInput);
    const file = fileInput.files[0];
    eventHandlersVRLogger.log("File:", file);
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

      eventHandlersVRLogger.log("Uploading file:", filename, "to path:", path);
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
        eventHandlersVRLogger.log(file, response.files[0].id, clientImageId);
        try {
          processImage(file, response.files[0].id, clientImageId);
        } catch (err) {
          eventHandlersVRLogger.log("Error processing image:", err);
        }

        //sanitize and validate input
        // processImage(file, response.data.files[0].id, clientImageId);
      } catch (error) {
        eventHandlersVRLogger.log("Error saving file info:", error);
        if (error.response && error.response.status === 409) {
          eventHandlersVRLogger.log("File already exists");
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
    eventHandlersVRLogger.log("read results VR");

    if (args.result && args.result.cwd && args.result.cwd.name) {
      state.currentPath = args.result.cwd.name;
      window.currentPath = state.currentPath;
    } else {
      eventHandlersVRLogger.error("Unexpected response structure:", args.result);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
    setBreadCrumb();
    // // await getRowGroup();
    // eventHandlersVRLogger.log("Row group:", rowGroup);
    // for (let i = 0; i < args.result.files.length; i++) {
    //   if (rowGroup) {
    //   const div = document.createElement("div");
    //   div.style.width = "100px";
    //   div.style.height = "100px";
    //   div.style.backgroundColor = "blue";
    //   rowGroup.appendChild(div);
    //   }
    // }
  }
};

export const onFileOpen = (args) => {
  eventHandlersVRLogger.log("file opened");
};

export const onFailure = (args) => {
  eventHandlersVRLogger.error("Failure:", args);
  if (args.error) {
    if (args.error.response) {
      eventHandlersVRLogger.error("Error response:", args.error.response);
      if (args.error.response.status) {
        eventHandlersVRLogger.error("Error status:", args.error.response.status);
      } else {
        eventHandlersVRLogger.error("Error response does not contain status");
      }
    } else {
      eventHandlersVRLogger.error("Error does not contain response");
    }
  } else {
    eventHandlersVRLogger.error("Unexpected error structure:", args);
  }
};

export const onBeforePopupOpen = (args) => {
  if (args.popupName === "Upload") {
    args.cancel = true;
  }
};


export const onFileLoad = async (args) => {
  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 1 second

  await getRowGroup();
  eventHandlersVRLogger.log("Row group:", rowGroup);
  let element = args.element;

  rowGroup.appendChild(args.element);

  if (args.fileDetails.isFile) {
      const targetElement = element.children[0];
      targetElement.addEventListener("click", (event) => {
        eventHandlersVRLogger.log("selected image: ", args.fileDetails.name);
      })


      element.addEventListener("click", (event) => {

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

      let targ = getSelectedShit();
      // eventHandlersVRLogger.log("targ", targ);

      // if (targ === currSelectedItem) {
      //   openFile(targ);
      // } else {
      currSelectedItem = targ;
      // }
    });
  } else {
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

      let targ = getSelectedShit();
      eventHandlersVRLogger.log("targ", targ);

      if (targ === currSelectedItem) {
        openFile(targ);
      } else {
        currSelectedItem = targ;
      }
    });
  }
};

const generateUniqueId = () => {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
};
