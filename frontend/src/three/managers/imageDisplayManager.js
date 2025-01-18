// import Logger from "../../utils/logger";
import { getMainStore } from "../../store/main";


class ImageDisplayManager {
  constructor() {
    if (ImageDisplayManager.instance) {
      return ImageDisplayManager.instance;
    }
    this.scene = null;
    this.store = null;
    // this.logger = new Logger("ImageDisplayManager");
    ImageDisplayManager.instance = this;
  }

  ensureDependencies() {
    if (!this.scene || !this.store) {
      throw new Error(
        "ImageManager dependencies are not set. Please call setScene() before using ImageManager."
      );
    }
  }

  setScene(scene) {
    this.scene = scene;
  }

  setStore() {
    this.store = getMainStore();
  }


  displayImage(image) {
    this.ensureDependencies();
    // logger.log("displaying image");
    if (this.store.supportsASTC) {
    //   logger.log("supports ASTC");
      if (image.compressedTexture) {
        this.scene.background = image.compressedTexture;
      } else {
        // logger.log("no compressed texture found");
        if (image.texture) {
          this.scene.background = image.texture;
        } else {
        //   logger.log("no alt texture found");
        }
      }
    } else {
    //   logger.log("image", image);
      if (image.texture) {
        this.scene.background = image.texture;
      } else {
        // logger.log("no texture found");
      }
    }
  }
}

const imageDisplayManager = new ImageDisplayManager();
export default imageDisplayManager;
