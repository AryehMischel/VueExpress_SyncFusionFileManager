import imageManager from '../managers/ImageManager';
import { renderer, scene } from '../../ThreeScene';
import { getMainStore } from "../../store/main";
import {TextureLoader,EquirectangularReflectionMapping, CompressedTexture, texture, UnsignedByteType} from 'three';
import { cdnPath, formats } from '../config';



class EquirectangularImage {
    constructor(srcArray, width, height, stereo, id, format, texture) {
      this.type = "Equirectangular";
      this.layer = null;
      this.astcTextureData = null;
      this.srcArray = srcArray; // Three.js equirectangular texture
      this.astcTexture = null; // Array of ASTC textures
      this.compressedTexture = null;
      this.stereo = stereo;
      this.width = width;
      this.height = height;
      this.texture = texture;
      this.loaded = false;
      this.id = id;
      this.format = format;
      this.radius = 20;
      this.renderer = renderer;
      this.scene = scene;
      // Validate the format parameter
      // const allowedFormats = ["astc_4x4", "ktx2", "img"];
      // if (!allowedFormats.includes(format)) {
      //   this.format = null;
      //   throw new Error(
      //     `Invalid format: ${format}. Allowed formats are: ${allowedFormats.join(
      //       ", "
      //     )}`
      //   );
      // }
  
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
        await this.loadImage(this.srcArray);
      } else if (this.format === "astc_4x4") {
        await this.loadAstcFile(this.srcArray, this.width, this.height);
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
  
    loadImage(url) {
      return new Promise((resolve, reject) => {
        let loader = new TextureLoader();
        // loader.setPath(cdnPath + "/");
        loader.load(
          url,
          (texture) => {
            this.texture = texture;
            this.texture.mapping = EquirectangularReflectionMapping;
            this.texture.needsUpdate = true;
            this.renderer.initTexture(this.texture);
            resolve();
          },
          undefined,
          reject
        );
      });
    }
  
    async loadAstcFile(url, width, height, format = 37808) {
      console.log("loading ASTC file");
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const rawData = new Uint8Array(arrayBuffer);
        // logger.log("rawData: ", rawData);
        // logger.log("rawDataLength: ", rawData.length);
  
        this.astcTextureData = new DataView(arrayBuffer, 16);
        let astcData;
        if (this.stereo) {
          // ASTC header is 16 bytes, data starts after that`
          const headerSize = 16;
          const blockSize = 4; // 4x4 block size
          const blockBytes = 16; // 16 bytes per block
  
          // Calculate the number of blocks in the full image
          const blocksPerRow = width / blockSize;
          const blocksPerColumn = height / blockSize;
  
          // Calculate the number of blocks in the bottom half
          const bottomHalfBlocks = (blocksPerColumn / 2) * blocksPerRow;
  
          // Extract the bottom half data
          const bottomHalfData = new Uint8Array(bottomHalfBlocks * blockBytes);
          const startOffset =
            headerSize + (blocksPerColumn / 2) * blocksPerRow * blockBytes;
          bottomHalfData.set(
            rawData.subarray(startOffset, startOffset + bottomHalfData.length)
          );
  
          // Create a DataView for the bottom half data
          astcData = new DataView(bottomHalfData.buffer);
        } else {
          astcData = this.astcTextureData;
        }
  
        let calculatedHeight = this.stereo ? height / 2 : height;
        // Create a compressed texture
        const compressedTexture = new CompressedTexture(
          [{ data: astcData, width, height: this.stereo ? height / 2 : height }], // Mipmaps (can be an array of levels)
          width,
          this.stereo ? height / 2 : height,
          format
        );
  
        compressedTexture.flipY = false; // Flip the texture vertically
        compressedTexture.mapping = EquirectangularReflectionMapping;
        compressedTexture.generateMipmaps = true;
        compressedTexture.needsUpdate = true;
        this.compressedTexture = compressedTexture;
  
        if (store.getImmersiveSession && !this.layer) {
          this.createXRLayer(glBinding, xrSpace);
        } else {
          const currentDirectory = store.currentWorkingDirectory;
          if (!imageManager.XRlayerQueue[currentDirectory]) {
            // If it doesn't exist, create it and set it to an empty array
            imageManager.XRlayerQueue[currentDirectory] = [];
          }
          imageManager.XRlayerQueue[currentDirectory].push(this.id);
        }
      } catch (error) {
        console.error("Error loading ASTC file:", error);
      }
    }
  
    async createXRLayer() {
      this.layer = glBinding.createEquirectLayer({
        space: xrSpace,
        viewPixelWidth: this.width,
        viewPixelHeight: this.height / (this.stereo ? 2 : 1),
        layout: this.stereo ? "stereo-top-bottom" : "mono",
        colorFormat: 37808, //,            // eval(),
        isStatic: "true",
      });
  
      this.layer.centralHorizontalAngle = Math.PI * 2;
      this.layer.upperVerticalAngle = -Math.PI / 2.0;
      this.layer.lowerVerticalAngle = Math.PI / 2.0;
      this.layer.radius = this.radius;
    }
  }

  export default EquirectangularImage;