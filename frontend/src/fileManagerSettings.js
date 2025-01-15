import { h } from 'vue';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const ajaxSettings = {
  url: `${apiBaseUrl}/api/filemanager/actions`,
  getImageUrl: `${apiBaseUrl}/api/filemanager/getImage`,
  uploadUrl: `${apiBaseUrl}/api/filemanager/upload`,
  downloadUrl: `${apiBaseUrl}/api/filemanager/download`,
  deleteUrl: `${apiBaseUrl}/api/filemanager/delete`,
  createFolderUrl: `${apiBaseUrl}/api/filemanager/create-folder`,
  saveUrl: `${apiBaseUrl}/api/filemanager/save`,
  };
  
  export const toolbarSettings = {
    visible: true,
    items: [
      "NewFolder",
      "customButton",
      "SortBy",
      "Cut",
      "Copy",
      "Paste",
      "Delete",
      "Refresh",
      "Download",
      "Rename",
      "Selection",
      "View",
      "Details",
    ],
  };
  
  export const contextMenuSettings = {
    file: ["Cut", "Copy", "|", "Delete", "Download", "Rename", "|", "Details"],
    layout: [
      "SortBy",
      "View",
      "Refresh",
      "|",
      "Paste",
      "|",
      "NewFolder",
      "|",
      "Details",
      "|",
      "SelectAll",
    ],
    visible: true,
  };
  
  export const view = "Details";
  
  export const detailsViewSettings = {
    columns: [
      {
        field: "name",
        headerText: "Name",
        customAttributes: { class: "e-fe-grid-name" },
        width: "110",
      },
      {
        field: "size",
        headerText: "Size",
        template: '<span class="e-fe-size">${size}</span>',
        width: "40",
        format: "n2",
      },
      {
        field: "format_360",
        headerText: "360 Format",
        template: '<span class="e-fe-size">${format_360}</span>',
        format: "n2",
        width: "90",
      },
      {
        field: "processed",
        headerText: "Processed",
        template: '<span>${processed}</span>',
        width: "90",
      },
      {
        field: "ready",
        headerText: "Ready",
        template: '<span id="defaultSpan" > ... </span>', // Use Vue interpolation
        width: "90",
      },
      {
        field: "progress",
        headerText: "Progress",
        template: '<div id="progress-${_id}" class="progress-bar" data-value="50"></div>',
        width: "90",
      },
      
    ],
  };


  export const breadcrumbBarSettings = { visible: true };
  
  export const uploadSettings = {
    showFileUploadDialog: false,
    allowUpload: true,
    maxFileSize: 200 * 1024 * 1024, // 200 MB
    // autoUpload: false,
    AllowedExtensions: "jpg, .jpeg, .png, .gif, .bmp, .svg, .mov",
    // AllowedExtensions: ".jpg, .jpeg, .png, .gif, .bmp, .svg, .mov",

  };
