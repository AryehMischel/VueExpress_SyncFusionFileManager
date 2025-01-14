import { log } from "three/src/nodes/TSL.js";
import { updateImageFormat, getPresignedUrl } from "../services/apiService.js";
import Logger from "../utils/logger.js";
import axios from "axios";
import { getMainStore } from "../store/main";
const workerCount = 4;
const workers = [];
const workerStatus = new Array(workerCount).fill(false); // Track worker availability
const images = {};
let store;
// Create different loggers for different file groups
const logger = new Logger("workerManager", true);

export const createWebWorkers = () => {
  logger.log("Creating web workers...");
  store = getMainStore();

  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./worker.js", import.meta.url));
    worker.onmessage = async function (e) {
      // Handle the worker response
      if (e.data.jobCompleted === "detect_360_Format") {
        logger.log("format detected: ", e.data);
        await handleFormatDetection(e);
      } else if (e.data.jobCompleted === "processed_cube_faces") {
        processCubeFaces(e);
      }

      workerStatus[i] = false;
    };

    workers.push(worker);
  }
};

const handleFormatDetection = async (e) => {
  const { format, imageID, clientImageId, height, width, imageFileType } =
    e.data;
  const image = images[clientImageId];

  try {
    await updateImageFormat(imageID, format);
    refreshFileManager();
    const presignedUrlData = await getPresignedUrl({
      imageGroupId: imageID,
      height,
      width,
      fileExtension: image.fileExtension,
      imageFormat: format,
    });

    logger.log("image group id", imageID);
    let targetUI = document.querySelector(`[data-image-id="${imageID}"]`);
    logger.log("targetUI", targetUI);
    const progressElement = Array.from(
      targetUI.querySelectorAll("[aria-label]")
    ).find((el) => el.getAttribute("aria-label").includes("Progress"));
    if (progressElement) {
      store.updateProgress(imageID, 0);
      logger.log("progressElement", progressElement);
      progressElement.querySelector;
      attachProgressBar(progressElement, imageID);
    }

    const config = {
      headers: {
        "Content-Type": imageFileType,
      },
      onUploadProgress: (progressEvent) => {
        const percentComplete =
          (progressEvent.loaded / progressEvent.total) * 100;
        logger.log(`Upload progress: ${percentComplete}%`);
        if (progressElement) {
          store.updateProgress(imageID, percentComplete.toFixed(2)); 
        }
      },
    };

    const res = await axios.put(presignedUrlData.file.url, image.file, config);
    if (res.status >= 200 && res.status < 300) {
      logger.log("File uploaded successfully");
      store.removeProgress(imageID);
      detachProgressBar(progressElement);
     
    } else {
      logger.error(`HTTP error! status: ${res.status}`);
    }
    // const res = await fetch(presignedUrlData.file.url, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": imageFileType,
    //   },
    //   body: image.file,
    // });

    // if (!res.ok) {
    //   throw new Error(`HTTP error! status: ${res.status}`);
    // }

    logger.log("File uploaded successfully");
  } catch (error) {
    logger.error("Error handling format detection:", error);
  }
};


const handleProcessedTextures = async (e) => {
  
}

const processCubeFaces = (e) => {
  logger.log("process cube faces");
};

export const processImage = async (file, id, clientImageId) => {
  const availableWorkerIndex = workerStatus.findIndex((status) => !status);
  if (availableWorkerIndex !== -1) {
    workerStatus[availableWorkerIndex] = true; // Mark the worker as busy
    workers[availableWorkerIndex].postMessage({ file, id, clientImageId });
  } else {
    // add file to work queue
  }
};

export const addImage = (clientImageId, image) => {
  images[clientImageId] = image;
};
