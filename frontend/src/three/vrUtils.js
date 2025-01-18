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

window.SET_TOOLBAR = setToolBar;

window.setBreadCrumb = setBreadCrumb;
