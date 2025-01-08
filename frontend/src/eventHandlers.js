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
      // Step 6: Refresh the file manager

      refreshFileManager();
      // console.log("fileManagerRef:", fileManagerRef);
      // if (fileManagerRef.value && typeof fileManagerRef.value.refreshFiles === 'function') {
      //   fileManagerRef.value.refreshFiles();
      // } else {
      //   console.error("FileManager instance not found or refreshFiles method is not available");
      // }

      //step 2: detect 360 format
      // const format = await detect360Format(
      //   file,
      //   clientImageId,
      //   fileExtension
      // );
      // console.log("format detected: ", format);

      //     // Step 2: Get presigned URL for the file upload
      //     const presignedUrlData = await getPresignedUrl({
      //       imageGroupId: response.files[0].id,
      //       height: file.height,
      //       width: file.width,
      //       fileExtension: fileExtension,
      //       imageFormat: "original",
      //     });

      //     // Step 3: Upload the file to the presigned URL
      //     const uploadResponse = await fetch(presignedUrlData.file.url, {
      //       method: "PUT",
      //       headers: {
      //         "Content-Type": file.type,
      //       },
      //       body: file,
      //     });

      //     if (!uploadResponse.ok) {
      //       throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      //     }

      //     console.log("File uploaded successfully");

      //     // Step 4: Update the ajaxSettings data

      //   } catch (error) {
      //     if (error.response && error.response.status === 409) {
      //       console.log("File already exists");
      //     } else {
      //       console.error("Error saving file info:", error);
      //     }
      //   }
    }
  }
};

export const onSuccess = (args, state) => {
  if (args.action === "read") {
    if (args.result && args.result.cwd && args.result.cwd.name) {
      state.currentPath = args.result.cwd.name;
      window.currentPath = state.currentPath;
    } else {
      console.error("Unexpected response structure:", args.result);
    }
  }
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

export const onFileLoad = (args) => {
  if (args.fileDetails.isFile) {
    if (args.element.childNodes.length > 5) {
      args.element.childNodes[5].classList.add("specialCase");
    }
  }
};

const generateUniqueId = () => {
  return "id-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
};
