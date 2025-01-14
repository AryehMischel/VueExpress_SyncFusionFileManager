import axios from "axios";


const apiBaseUrl = import.meta.env.VITE_API_BASE_URL + "/api"

export const updateImageFormat = async (imageID, format) => {
  try {
    const response = await axios.patch(`${apiBaseUrl}/filemanager/image/360-format`, {
      id: imageID,
      format: format,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating image format:", error);
    if (error.response) {
      console.error("Error response:", error.response);
      if (error.response.status) {
        console.error("Error status:", error.response.status);
      } else {
        console.error("Error response does not contain status");
      }
    } else {
      console.error("Error does not contain response");
    }
    throw error;
  }
};

export const getUserImages = async (userId, groupId) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/filemanager/images`, {
      params: {
        userId: userId,
        groupId: groupId,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting user images:", error);
    if (error.response) {
      console.error("Error response:", error.response);
      if (error.response.status) {
        console.error("Error status:", error.response.status);
      } else {
        console.error("Error response does not contain status");
      }
    } else {
      console.error("Error does not contain response");
    }
    throw error;
  }
}

window.getUserImages = getUserImages;

export const getPresignedUrl = async (imageData) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/s3/presigned-url`, imageData);
    return response.data;
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    if (error.response) {
      console.error("Error response:", error.response);
      if (error.response.status) {
        console.error("Error status:", error.response.status);
      } else {
        console.error("Error response does not contain status");
      }
    } else {
      console.error("Error does not contain response");
    }
    throw error;
  }
};

export const uploadFileInfo = async (fileInfo) => {
  try {
    const response = await axios.post(`${apiBaseUrl}/filemanager/upload`, fileInfo);
    return response.data;
  } catch (error) {
    console.error("Error uploading file info:", error);
    if (error.response) {
      console.error("Error response:", error.response);
      if (error.response.status) {
        console.error("Error status:", error.response.status);
      } else {
        console.error("Error response does not contain status");
      }
    } else {
      console.error("Error does not contain response");
    }
    throw error;
  }
};