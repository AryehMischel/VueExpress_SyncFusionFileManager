import imageManager from '../managers/ImageManager';
import { renderer, scene } from '../../ThreeScene';
import { getMainStore } from "../../store/main";
import {CubeTextureLoader, CompressedCubeTexture, UnsignedByteType} from 'three';
import { cdnPath, formats } from '../config';
import webXRStore from "../../store/WebXRStore";
class CubeLayer {
    constructor(srcArray, width, height, stereo, id, format) {
      this.type = "CubeMap";
      this.layer = null;
      this.texture = null;
      this.srcArray = srcArray;
      this.astcTextureData = [[], []];
      this.stereo = stereo;
      this.format = format; // ASTC format
      this.width = width;
      this.height = height;
      this.loaded = false;
      this.id = id;
      this.renderer = renderer;
      this.scene = scene;
      this.store = getMainStore();
      console.log("cubelayer store", this.store);
      this.glBinding = null;
      this.xrSpace = null;
      // this.initializeTexture();
    }
  
    async loadAllImages() {
      if (this.format === null) {
        throw new Error("Invalid format");
        return;
      }
      if (this.srcArray.length < 1) {
        throw new Error("No images to load");
        return;
      }
  
      if (this.format === "img") {
        // logger.log("does this ever actually run?");
        //await this.loadImage(this.srcArray)
        let firstSixUrls = this.srcArray.slice(0, 6);
        await this.createCubeTexture(firstSixUrls);
        firstSixUrls = null;
      } else if (this.format === "astc_4x4") {
        let firstSixUrls = this.srcArray.slice(0, 6);
        await this.loadAstcCube(
          firstSixUrls,
          this.width,
          this.height,
          formats[this.format]
        );
        if (this.stereo) {
        //   logger.log("getting last six urls");
          let lastSixUrls = this.srcArray.slice(6, 12);
          await this.loadAstcTextures(
            lastSixUrls,
            this.width,
            this.height,
            formats[this.format]
          );
          lastSixUrls = null;
        } else {
          if (this.store.getImmersiveSession && !this.layer) {

            if(this.glBinding === null){
              this.glBinding = webXRStore.getGLBinding();
            }

            if(this.xrSpace === null){
              this.xrSpace = webXRStore.getXRSpace();
            }
            this.createXRLayer(this.glBinding, this.xrSpace);
          } else {
            const currentDirectory = this.store.currentWorkingDirectory;
            if (!imageManager.XRlayerQueue[currentDirectory]) {
              // If it doesn't exist, create it and set it to an empty array
              imageManager.XRlayerQueue[currentDirectory] = [];
            }
            imageManager.XRlayerQueue[currentDirectory].push(this.id);
          }
        }
        firstSixUrls = null;
      }
  
      const element = document.querySelector(`[data-image-id="${this.id}"]`);
      if (element) {
        let ready = element.querySelector("#defaultSpan");
        if (ready) {
          ready.innerHTML = "✔️";
        }
      } else {
        // logger.warn("No element found with imageId:", this.id);
      }
  
      this.loaded = true;
    }
  
    async loadAstcCube(urls, width, height, format) {
      try {
        const promises = urls.map(async (url) => {
        //   logger.log("Fetching URL:", url);
          const response = await fetch(cdnPath + "/" + url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const rawData = new Uint8Array(arrayBuffer);
        //   logger.log("rawData: ", rawData);
        //   logger.log("rawDataLength: ", rawData.length);
  
          // Create a DataView starting from byte offset 16
          const astcData = new Uint8Array(arrayBuffer, 16); // Skip the ASTC header
          return {
            data: astcData,
            width,
            height,
            format,
          };
        });
  
        const facesData = await Promise.all(promises);
        this.astcTextureData[0] = facesData.map((face) => face.data);
  
        // logger.log("Faces data:", facesData);
  
        const compressedTexture = new CompressedCubeTexture(
          facesData.map((face) => ({
            mipmaps: [
              { data: face.data, width: face.width, height: face.height },
            ],
            width: face.width,
            height: face.height,
            format: face.format,
          })),
          37808,
          UnsignedByteType
        );
  
        //   compressedTexture.minFilter = LinearMipmapLinearFilter;
        //   compressedTexture.magFilter = LinearFilter;
        //   compressedTexture.generateMipmaps = true;
        compressedTexture.needsUpdate = true;
        this.compressedTexture = compressedTexture;
      } catch (error) {
        // logger.error("Error loading compressed cube map:", error);
        throw error;
      }
    }
  
    async loadAstcTextures(urls, width, height, format) {
    //   logger.log("getting last six urls");
      try {
        const promises = urls.map(async (url) => {
        //   logger.log("Fetching URL:", url);
          const response = await fetch(cdnPath + "/" + url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const rawData = new Uint8Array(arrayBuffer);
          // Create a DataView starting from byte offset 16
          const astcData = new Uint8Array(arrayBuffer, 16); // Skip the ASTC header
          return astcData;
        });
  
        // Wait for all promises to resolve and get the astcData array
        const astcDataArray = await Promise.all(promises);
        // logger.log("ASTC Data Array:", astcDataArray);
  
        // Now you have the astcDataArray with the data in the order they were fetched
        this.astcTextureData[1] = astcDataArray;
  
        if (this.store.getImmersiveSession && !this.layer) {
          this.createXRLayer(glBinding, xrSpace);
        } else {
          const currentDirectory = this.store.currentWorkingDirectory;
          if (!imageManager.XRlayerQueue[currentDirectory]) {
            // If it doesn't exist, create it and set it to an empty array
            imageManager.XRlayerQueue[currentDirectory] = [];
          }
          imageManager.XRlayerQueue[currentDirectory].push(this.id);
        }
      } catch (error) {
        // logger.error("Error loading compressed cube map:", error);
        throw error;
      }
    }
  
    async createCubeTexture(urls) {
    //   logger.log("urls without cdn", urls);
      let loader = new CubeTextureLoader();
      loader.setPath(cdnPath + "/");
  
      try {
        // logger.log("CREATING CUBEMAP TEXTURE FROM IMAGES");
        const texture = await new Promise((resolve, reject) => {
          loader.load(urls, resolve, undefined, reject);
        });
  
        this.texture = texture;
        this.texture.needsUpdate = true;
        this.renderer.initTexture(this.texture);
      } catch (error) {
        // logger.error("Error creating cubemap texture:", error);
        throw error;
      }
    }
    async loadKTX2Files() {}
  
    // Method to create the WebXR layer
    createXRLayer(glBinding, xrSpace) {
      this.layer = glBinding.createCubeLayer({
        space: xrSpace,
        viewPixelWidth: this.width,
        viewPixelHeight: this.height,
        layout: this.stereo ? "stereo" : "mono",
        colorFormat: formats[this.format],
        isStatic: false,
      });
    }
  
    // Method to check if the layer is stereo
    isStereo() {
      return this.stereo;
    }
  }

  export default CubeLayer;