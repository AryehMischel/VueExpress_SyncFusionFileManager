import { updateImageFormat, getPresignedUrl } from "../services/apiService.js";
import Logger from '../utils/logger.js';

const workerCount = 4;
const workers = [];
const workerStatus = new Array(workerCount).fill(false); // Track worker availability
const images = {};

// Create different loggers for different file groups
const workerManagerLogger = new Logger('workerManager', true);

export const createWebWorkers = () => {
    workerManagerLogger.log("Creating web workers...");
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker(new URL("./worker.js", import.meta.url));
    worker.onmessage = async function (e) {
      // Handle the worker response
      if (e.data.jobCompleted === "detect_360_Format") {
         workerManagerLogger.log("format detected: ", e.data);
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
  const { format, imageID, clientImageId, height, width, imageFileType } = e.data;
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

    const res = await fetch(presignedUrlData.file.url, {
      method: "PUT",
      headers: {
        "Content-Type": imageFileType,
      },
      body: image.file,
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    workerManagerLogger.log("File uploaded successfully");
  } catch (error) {
    workerManagerLogger.error("Error handling format detection:", error);
  }
};

const processCubeFaces = (e) => {
  workerManagerLogger.log("process cube faces");
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