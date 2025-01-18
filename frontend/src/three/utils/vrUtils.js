import { HTMLMesh } from "three/examples/jsm/interactive/HTMLMesh.js";

//make selecting directories work from breadcrumb bar in vr mode
function setBreadCrumb() {
  let breadCrumb = document.getElementById("file-manager_breadcrumbbar");
  let urlParent = breadCrumb.querySelector(".e-addressbar-ul");
  logger.log("urlParent", urlParent);
  for (let i = 0; i < urlParent.children.length; i++) {
    urlParent.children[i].addEventListener("click", () => {
      let clicky = urlParent.children[i].querySelector(".e-list-text");
      clicky.click();
    });
  }
}

function setToolBar() {
  let toolBar = document.getElementById("file-manager_tb_close panel");
  console.log("toolbar", toolBar);
  toolBar.addEventListener("click", () => {
    swapUI();
    console.log("clicked on toolbar");
  });
}

export function addFileManager(group) {
  let panel = document.getElementById("file-manager");
  let vrui = new HTMLMesh(panel);
  vrui.position.x = -0.75;
  vrui.position.y = 1.5;
  vrui.position.z = -2;
  vrui.rotation.y = Math.PI / 4;
  vrui.scale.setScalar(4);
  group.add(vrui);
  return vrui;
}


export function hideInteractiveElements(elements, interactiveGroup){
    elements.forEach(element => {
      element.visible = false;
      interactiveGroup.remove(element);
    });
  
  }
  
  
  export function unhideInteractiveElements(elements, interactiveGroup){
    elements.forEach(element => {
      element.visible = true;
      interactiveGroup.add(element);
    });
  
  }

export function toggleVRUI() {
  if (window.vrui) {
    window.vrui.visible = !window.vrui.visible;
  }
}

export function enableDebugView() {
  // Implement debug view enabling logic here
}

export function disableDebugView() {
  // Implement debug view disabling logic here
}

async function getRowGroup() {
  const fileManagerGrid = document.getElementById("file-manager_grid");
  if (fileManagerGrid) {
    const gridContent = fileManagerGrid.querySelector(".e-gridcontent");
    if (gridContent) {
      const rowGroups = gridContent.querySelectorAll('[role="rowgroup"]');
      logger.log("rowgroups: ", rowGroups.length);
      if (rowGroups.length === 1) {
        rowGroup = rowGroups[0];
        return rowGroup;
      }
    } else {
      logger.error(
        'Element with classes "e-gridcontent e-lib e-touch" not found under file-manager_grid'
      );
    }
  } else {
    logger.error('Element with id "file-manager_grid" not found');
  }
}

function removeFileManager() {
  group.remove(vrui);
  vrui.geometry.dispose();
  vrui.material.map.dispose();
  vrui.material.dispose();
}



window.removeFileManager = removeFileManager;
window.getRowGroup = getRowGroup;
window.SET_TOOLBAR = setToolBar;
window.setBreadCrumb = setBreadCrumb;
