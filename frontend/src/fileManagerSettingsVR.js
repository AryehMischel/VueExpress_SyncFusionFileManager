export const ajaxSettings = {
    url: "http://localhost:3000/api/filemanager/actions",
    getImageUrl: "http://localhost:3000/api/filemanager/getImage",
    uploadUrl: "http://localhost:3000/api/filemanager/upload",
    downloadUrl: "http://localhost:3000/api/filemanager/download",
    deleteUrl: "http://localhost:3000/api/filemanager/delete",
    createFolderUrl: "http://localhost:3000/api/filemanager/create-folder",
    saveUrl: "http://localhost:3000/api/filemanager/save",
  };
  
  export const toolbarSettings = {
    visible: false,
    items: [
      "NewFolder",
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
      },
      {
        field: "_fm_modified",
        headerText: "DateModified",
        format: "MM/dd/yyyy hh:mm a",
      },
      {
        field: "size",
        headerText: "Size",
        template: '<span class="e-fe-size">${size}</span>',
        format: "n2",
      },
      {
        field: "format_360",
        headerText: "360 Format",
        template: '<span class="e-fe-size">${format_360}</span>',
        format: "n2",

      },
      {
        field: "processed",
        headerText: "Processed",
        template: '<span>${processed}</span>',
      },
    ],
  };


  export const breadcrumbBarSettings = { visible: true };
  
  export const uploadSettings = {
    showFileUploadDialog: false,
    allowUpload: true,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    // autoUpload: false,
    AllowedExtensions: "jpg, .jpeg, .png, .gif, .bmp, .svg, .mov",
    // AllowedExtensions: ".jpg, .jpeg, .png, .gif, .bmp, .svg, .mov",

  };

  

// const uploadSettings = {
//   showFileUploadDialog: false,
//   allowUpload: true,
// };


// const ajaxSettings = {
//   url: "http://localhost:3000/api/filemanager/actions",
//   getImageUrl: "http://localhost:3000/api/filemanager/getImage",
//   uploadUrl: "http://localhost:3000/api/filemanager/upload",
//   downloadUrl: "http://localhost:3000/api/filemanager/download",
//   deleteUrl: "http://localhost:3000/api/filemanager/delete",
//   createFolderUrl: "http://localhost:3000/api/filemanager/create-folder",
//   saveUrl: "http://localhost:3000/api/filemanager/save",
// };

// const toolbarSettings = {
//   items: [
//     "NewFolder",
//     "SortBy",
//     "Cut",
//     "Copy",
//     "Paste",
//     "Delete",
//     "Refresh",
//     "Download",
//     "Rename",
//     "Selection",
//     "View",
//     "Details",
//   ],
// };

// const contextMenuSettings = {
//   file: ["Cut", "Copy", "|", "Delete", "Download", "Rename", "|", "Details"],
//   layout: [
//     "SortBy",
//     "View",
//     "Refresh",
//     "|",
//     "Paste",
//     "|",
//     "NewFolder",
//     "|",
//     "Details",
//     "|",
//     "SelectAll",
//   ],
//   visible: true,
// };

// const view = "Details";

// const detailsViewSettings = {
//   columns: [
//     {
//       field: "name",
//       headerText: "Name",
//       customAttributes: { class: "e-fe-grid-name" },
//     },
//     {
//       field: "_fm_modified",
//       headerText: "DateModified",
//       format: "MM/dd/yyyy hh:mm a",
//     },
//     {
//       field: "size",
//       headerText: "Size",
//       template: '<span class="e-fe-size">${size}</span>',
//       format: "n2",
//     },
//   ],
// };

// const breadcrumbBarSettings = { visible: true };
