import { h } from 'vue';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const ajaxSettings = {
  url: `${apiBaseUrl}/api/album/filemanager/actions`,
  getImageUrl: `${apiBaseUrl}/album/api/filemanager/getImage`,
  uploadUrl: `${apiBaseUrl}/album/api/filemanager/upload`,
  downloadUrl: `${apiBaseUrl}/album/api/filemanager/download`,
  deleteUrl: `${apiBaseUrl}/album/api/filemanager/delete`,
  createFolderUrl: `${apiBaseUrl}/album/api/filemanager/create-folder`,
  saveUrl: `${apiBaseUrl}/album/api/filemanager/save`,
  };
  
  export const toolbarSettings = {
    visible: true,
    items: [
      "SortBy",
      "Refresh",
      "Download",
      "Selection",
      "View",
      "Details",
    ],
  };
  
  export const contextMenuSettings = {
    file: [ "Download", "Details"],
    layout: [
      "SortBy",
      "View",
      "Refresh",
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
