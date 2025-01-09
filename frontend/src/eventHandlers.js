import { uploadFileInfo, getPresignedUrl } from "./services/apiService.js";
import { processImage, addImage } from "./workers/workerManager.js";

export const onBeforeSend = async (args, fileManagerRef) => {
  if (args.action === "Upload") {
    const fileInput = document.querySelector("#file-manager_upload");
    console.log("File input element:", fileInput);
    const file = fileInput.files[0];
    console.log("File:", file);
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

      console.log("Uploading file:", filename, "to path:", path);
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
        console.log(file, response.files[0].id, clientImageId);
        try {
          processImage(file, response.files[0].id, clientImageId);
        } catch (err) {
          console.log("Error processing image:", err);
        }

        //sanitize and validate input
        // processImage(file, response.data.files[0].id, clientImageId);
      } catch (error) {
        console.log("Error saving file info:", error);
        if (error.response && error.response.status === 409) {
          console.log("File already exists");
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
    console.log("read results:", args)

    if (args.result && args.result.cwd && args.result.cwd.name) {
      state.currentPath = args.result.cwd.name;
      window.currentPath = state.currentPath;
    } else {
      console.error("Unexpected response structure:", args.result);
    }

    // await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
    // // await getRowGroup();
    // console.log("Row group:", rowGroup);
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
  console.log("file opened")

};

export const onFailure = (args) => {
  console.error("Failure:", args);
  if (args.error) {
    if (args.error.response) {
      console.error("Error response:", args.error.response);
      if (args.error.response.status) {
        console.error("Error status:", args.error.response.status);
      } else {
        console.error("Error response does not contain status");
      }
    } else {
      console.error("Error does not contain response");
    }
  } else {
    console.error("Unexpected error structure:", args);
  }
};

export const onBeforePopupOpen = (args) => {
  if (args.popupName === "Upload") {
    args.cancel = true;
  }
};

export const onFileLoad = async (args) => {
  console.log("File loaded but shouldn't:", args);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
  await getRowGroup();
  console.log("Row group:", rowGroup);
  let element = args.element
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
    console.log("targ", targ);

    if (targ === currSelectedItem) {
      openFile(targ);
    } else {
      currSelectedItem = targ;
    }
    //   document.body.classList = ""

    //children[i].children[0].dispatchEvent(mouseUpEvent);
  });
  rowGroup.appendChild(args.element);
 
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
