import downloadManager from "./DownloadManager";
import imageDisplayManager from "./imageDisplayManager.js";
import { getMainStore } from "../../store/main";
import CubeLayer from "../layers/cubeLayer";
import EquirectangularImage from "../layers/EqrtLayer";
import { renderer, scene } from '../../ThreeScene';
import { cdnPath } from '../config';
import webXRStore from "../../store/WebXRStore";
class ImageManager {
  constructor() {
    if (ImageManager.instance) {
      return ImageManager.instance;
    }
    this.store = null;
    this.scene = null;

    console.log("image manager scene", scene); 

    this.images = {};
    this.imageOrder = []; // purely placeholder code for implementing demo. Order will have to track with syncfusion order by data
    this.currentImageIndex = 0;
    this.activeLayers = new Set();
    this.currentImage = null;
    this.XRlayerQueue = { "/": [] }; //{"/": [exampleLayer1, exampleLayer2], "/other": [exampleLayer3], "/other/nested": [exampleLayer4]}
    ImageManager.instance = this;
  }



  ensureDependencies() {
    if (!this.scene || !this.store) {
      throw new Error("ImageManager dependencies are not set. Please call setScene() before using ImageManager.");
    }
  }

  setStore(){
    this.store = getMainStore();
  }

  setScene(scene) {
    this.scene = scene;
  }


  addImage(name, imageInstance) {
    this.ensureDependencies();
    this.images[name] = imageInstance;
    this.imageOrder.push(name);
    downloadManager.addToQueue(imageInstance);
  }

  addStore() {
    this.store = getMainStore();
  }

  selectNextImage() {
    this.ensureDependencies();
    if (this.imageOrder.length === 0) {
      return;
    }
    if (this.currentImageIndex < this.imageOrder.length - 1) {
      this.currentImageIndex++;
    } else {
      this.currentImageIndex = 0;
    }

    console.log("current image index", this.currentImageIndex);
    console.log("curr image", this.imageOrder[this.currentImageIndex]);
    this.selectImage(this.imageOrder[this.currentImageIndex]);
  }

  selectPreviousImage() {
    this.ensureDependencies();
    if (this.imageOrder.length === 0) {
      return;
    }
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    } else {
      this.currentImageIndex = this.imageOrder.length - 1;
    }
    this.selectImage(this.imageOrder[this.currentImageIndex]);
  }

  removeImage(name) {
    this.ensureDependencies();
    delete this.images[name];
  }

  selectImage(name) {
    this.ensureDependencies();
    if (this.images[name]) {
      this.currentImage = this.images[name];

      console.log("is Immersive Session?", this.store.getImmersiveSession);
      console.log("has Layer?", this.images[name].layer);

      if (this.store.getImmersiveSession && this.images[name].layer) {
        if (!this.activeLayers.has(name)) {
          this.activeLayers.add(name);
        }
        if (this.scene.background) {
        //   logger.log("removing scene background");
          this.scene.background = null;
        }
        if(!this.xrSession){
          this.xrSession = webXRStore.getXRSession();
        }
        this.setLayer(this.images[name].layer);
      } else {
        imageDisplayManager.displayImage(this.currentImage);
        //console.log("displaying image", this.currentImage);
      }
    } else {
    //   logger.warn(`Image ${name} not found`);
    }
  }

  
  setLayer(layer) {
    // let layerLength = xrSession.renderState.layers.length;
    this.xrSession.updateRenderState({
      layers: [
        layer,
        this.xrSession.renderState.layers[this.xrSession.renderState.layers.length - 1],
      ],
    });
  }

  async createImageObjects(imageData) {
    this.ensureDependencies();
    if (imageData.groupId in this.images) {
      if (this.store.getImmersiveSession && !this.images[imageData.groupId].layer) {
        console.log("creating layer for existing image");
        this.images[imageData.groupId].createXRLayer(glBinding, xrSpace);
      }

    //   logger.log("image already exists");

      if (this.images[imageData.groupId].texture) {
        const element = document.querySelector(
          `[data-image-id="${imageData.groupId}"]`
        );
        if (element) {
          let ready = element.querySelector("#defaultSpan");
          if (ready) {
            ready.innerHTML = "✔️";
          }
        } else {
        //   logger.warn("No element found with imageId:", imageData.groupId);
        }
      }

      return;
    }

    // logger.log("creating image objects");
    if (imageData.format_360 === "equirectangular") {
      let imageArr = JSON.parse(imageData.faces);
      let url = `${cdnPath}/${imageArr[0]}`;
      let equirectangularImage = new EquirectangularImage(
        url,
        imageData.width,
        imageData.height,
        false,
        imageData.groupId,
        imageData.textureFormat
      );
      this.addImage(imageData.groupId, equirectangularImage);
    } else if (imageData.format_360 === "stereo_equirectangular") {
      let imageArr = JSON.parse(imageData.faces);
      let url = `${cdnPath}/${imageArr[0]}`;
      let equirectangularImage = new EquirectangularImage(
        url,
        imageData.width,
        imageData.height,
        true,
        imageData.groupId,
        imageData.textureFormat
      );
      this.addImage(imageData.groupId, equirectangularImage);
    } else if (imageData.format_360 === "cubemap") {
    //   logger.log("creating cubemap of type", imageData.textureFormat);
      let faces = JSON.parse(imageData.faces);
      let cubeLayer = new CubeLayer(
        faces,
        imageData.width,
        imageData.height,
        false,
        imageData.groupId,
        imageData.textureFormat
      );
      this.addImage(imageData.groupId, cubeLayer);
    } else if (imageData.format_360 === "stereo_cubemap") {
    //   logger.log("creating cubemap of type", imageData.textureFormat);
      let faces = JSON.parse(imageData.faces);
      let cubeLayer = new CubeLayer(
        faces,
        imageData.width,
        imageData.height,
        true,
        imageData.groupId,
        imageData.textureFormat
      );

      this.addImage(imageData.groupId, cubeLayer);
    }
  }

  async createImageObjectWithTexture(id, format_360, texture, height, width) {
    this.ensureDependencies();
    if (format_360 === "equirectangular") {
      let equirectangularImage = new EquirectangularImage(
        null,
        width,
        height,
        false,
        id,
        1023, //bitmap srgb data
        texture
      );
      equirectangularImage.loaded = true;
      this.images[id] = equirectangularImage;
      this.imageOrder.push(id);
    } else if (format_360 === "stereo_equirectangular") {
      let equirectangularImage = new EquirectangularImage(
        null,
        width,
        height,
        true,
        id,
        1023, //bitmap srgb data
        texture
      );
      console.log("STEREO EQUIRECTANGULAR IMAGE CREATED", equirectangularImage);
      equirectangularImage.loaded = true;
      this.images[id] = equirectangularImage;
      this.imageOrder.push(id);
    } else if (format_360 === "cubemap") {
      let cubeLayer = new CubeLayer(
        null,
        width,
        height,
        false,
        id,
        1023 //bitmap srgb data
      );
      cubeLayer.texture = texture;
      cubeLayer.loaded = true;
      this.images[id] = cubeLayer;
      this.imageOrder.push(id);
    } else if (format_360 === "stereo_cubemap") {
      let cubeLayer = new CubeLayer(
        null,
        width,
        height,
        true,
        id,
        1023 //bitmap srgb data
      );
      cubeLayer.texture = texture;
      cubeLayer.loaded = true;
      this.images[id] = cubeLayer;
      this.imageOrder.push(id);
    }
  }

  async processLayerQueue(glBinding, xrSpace) {
    this.ensureDependencies();
    //check current image
    console.log("creating layers via queue...");
    // if (this.currentImage) {
    //   if (!this.currentImage.layer) {
    //     await this.currentImage.createXRLayer(glBinding, xrSpace);
    //     // this.selectImage(this.currentImage.id);
    //   }
    // }

    //check all images in the queue
    let cwd = this.store.currentWorkingDirectory;
    let layersInCWD = this.XRlayerQueue[cwd];

    for (let i = 0; i < layersInCWD.length; i++) {
      if (!this.images[layersInCWD[i]].layer) {
        this.images[layersInCWD[i]].createXRLayer(glBinding, xrSpace);
        // this.activeLayers.add(layersInCWD[i]);
      }
    }

    console.log("processing layer queue");
  }
}

const imageManager = new ImageManager();
export default imageManager;
