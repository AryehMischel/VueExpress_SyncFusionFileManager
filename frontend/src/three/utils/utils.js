
export function onWindowResize(camera, renderer, logger) {
    logger.log("resize");
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  
    // Check if a VR session is active before resizing the renderer
    if (!renderer.xr.isPresenting) {
      renderer.setSize(window.innerWidth, window.innerHeight);
    } else {
      logger.warn("Cannot change size while VR device is presenting");
    }
  }