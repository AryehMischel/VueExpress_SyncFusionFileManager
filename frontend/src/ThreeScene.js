import {
  Scene,
  Texture,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector2,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  CanvasTexture,
  EquirectangularReflectionMapping,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Color,
  BufferGeometry,
  Vector3,
  Line,
  LineBasicMaterial,
  DoubleSide,
  LinearFilter,
  TextureLoader,
  UnsignedByteType,
  CompressedTexture,
  CompressedCubeTexture,
  CubeTextureLoader,
  LinearMipmapLinearFilter,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { HTMLMesh } from "three/addons/interactive/HTMLMesh.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import ThreeMeshUI from "https://cdn.skypack.dev/three-mesh-ui";
let cdnPath = "https://d1w8hynvb3moja.cloudfront.net";
let scene,
  camera,
  renderer,
  controls,
  controllers,
  group,
  ktx2Loader,
  gl,
  glBinding,
  xrSpace,
  xrSession;
let vrMode = false;
window.vrMode = vrMode;

//vr ui stuff
let vrui;
let rowGroup;
let currSelectedItem = null;
window.currSelectedItem = currSelectedItem;

try {
  let layersPolyfill = new WebXRLayersPolyfill();
} catch {
  if ("xr" in navigator) {
    //weird. your device supports webxr but not the polyfill.
  } else {
    console.log("WebXR is not supported on this device.");
  }
}

// to store WebXR Layers
let layers = new Object();
let activeLayers = [];

//create scene, add lights
scene = new Scene();
setupScene(scene);

//create camera
camera = customSkyCamera();
window.camera = camera; 

//create renderer, add it to the dom and set animation loop
renderer = customRenderer();

document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(animate);

//add event listeners for the start and end of the xr session
renderer.xr.addEventListener("sessionstart", () => onSessionStart());
renderer.xr.addEventListener("sessionend", () => onSessionEnd());

//add vr button
document.body.appendChild(VRButton.createButton(renderer));

//add pc controls ('awsd' to move, mouse to look around)
controls = customControls(camera, renderer);

//create vr hand controls with models
controllers = customControllers(scene, renderer);

//create interactive group
group = new InteractiveGroup();
group.listenToXRControllerEvents(controllers[0]);
group.listenToXRControllerEvents(controllers[1]);
scene.add(group);

//create ktx2loader (slightly modified threejs 0.169.0 ktx2loader)
ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath(
  "https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/libs/basis/"
);
ktx2Loader.detectSupport(renderer);
ktx2Loader.setWorkerLimit(8);

//webgl context
gl = renderer.getContext();

//get webgl compressed texture extensions
let ASTC_EXT = gl.getExtension("WEBGL_compressed_texture_astc");
let ETC_EXT = gl.getExtension("WEBGL_compressed_texture_etc");

if (ASTC_EXT) {
  console.log("ASTC_EXT", ASTC_EXT);
} else {
  console.log("no astc");
}
if (ETC_EXT) {
  console.log("ETC_EXT", ETC_EXT);
} else {
  console.log("no etc");
}

//animation loop
function animate(t, frame) {
  const xr = renderer.xr;
  const session = xr.getSession();
  xrSession = session;
  if (
    session &&
    session.renderState.layers !== undefined &&
    session.hasMediaLayer === undefined
  ) {
    console.log("creating media layer");
    session.hasMediaLayer = true;
    session.requestReferenceSpace("local-floor").then((refSpace) => {
      glBinding = xr.getBinding();
      xrSpace = refSpace;
    });
  }

  //this good, since we are using mostly static layers,
  // maybe an improvement would be grouping for the  active static Layers which need to be redrawn
  // (we still call it redrawing even if it's technically the first time we are drawing to the webxr layer)
  // in order to avoid checking static layers each frame.
  for (let i = 0; i < activeLayers.length; i++) {
    if (activeLayers[i].layer.needsRedraw) {
      drawWebXRLayer(activeLayers[i], session, frame);
    }
  }

  renderer.render(scene, camera);
  controls.update();
}

function drawWebXRLayer(layer, session, frame) {
  if (layer.type === "WebXREquirectangularLayer") {
    drawCompressedWebXREquirectangularLayer(layer, frame);
  } else if (layer.type === "WebXRCubeLayer") {
    drawWebXRCubeLayer(layer, session, frame);
  } else if (layer.type === "WebXRQuadLayer") {
    drawWebXRQuadLayer(layer, session, frame);
  } else if (layer.type === "WebXRQuadUILayer") {
    drawWebXRQuadUILayer(layer, session, frame);
  }
}

function drawWebXREquirectangularLayer(layer, session, frame) {
  let width = layer.width;
  let height = layer.height;
  let glayer = glBinding.getSubImage(layer.layer, frame);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    width,
    height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    layer.textures
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  if (layer.stereo) {
    console.log("add stereo support");
  }
}

function drawCompressedWebXREquirectangularLayer(layer, frame) {
  let format = eval(layer.format);
  let width = layer.width;
  let height = layer.height;

  let glayer = glBinding.getSubImage(layer.layer, frame);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);

  gl.compressedTexSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    width,
    height,
    format,
    layer.textures
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  if (layer.stereo) {
    console.log("add stereo support");
  }
}

//currently only handles compressed textures
function drawWebXRCubeLayer(layer, session, frame) {
  let format = eval(layer.format);
  console.log("format is?", format);
  let width = layer.width;

  if (!layer.stereo) {
    console.log("drawing cube layer");
    let glayer = glBinding.getSubImage(layer.layer, frame);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, glayer.colorTexture);

    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[0]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[1]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[2]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[3]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[4]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[5]
    ); //es
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  } else {
    let glayer = glBinding.getSubImage(layer.layer, frame, "left");
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, glayer.colorTexture);

    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[0]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[1]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[2]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[3]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[4]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[5]
    ); //es

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

    glayer = glBinding.getSubImage(layer.layer, frame, "right");
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, glayer.colorTexture);

    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[6]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[7]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[8]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[9]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[10]
    ); //es
    gl.compressedTexSubImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      0,
      0,
      0,
      width,
      width,
      format,
      layer.textures[11]
    ); //es

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}

function drawWebXRQuadLayer(layer, session, frame) {
  let format = eval(layer.format);
  let width = layer.width;
  let height = layer.height;
  console.log("drawing quad layer", height, width);

  let glayer = glBinding.getSubImage(layer.layer, frame);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
  gl.compressedTexSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    width,
    height,
    format,
    layer.texture
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawWebXRQuadUILayer(layer, session, frame) {
  let glayer = glBinding.getSubImage(layer.layer, frame);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    layer.image
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
}

//utils  / control-flow-logic
window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  console.log("resize");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // Check if a VR session is active before resizing the renderer
  if (!renderer.xr.isPresenting) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    console.warn("Cannot change size while VR device is presenting");
  }
}
function createLayer(imagename) {
  let layer = layers[imagename];
  layer.createLayer();
}

function destroyLayer(imagename) {
  let layer = layers[imagename];
  layer.destroy();
}

function setLayer(layerID, isUIlayer = false) {
  let layerLength = xrSession.renderState.layers.length;
  activeLayers.push(layers[layerID]);
  console.log("layer length", layerLength);
  xrSession.updateRenderState({
    layers: [
      layers[layerID].layer,
      xrSession.renderState.layers[xrSession.renderState.layers.length - 1],
    ],
  });
}

function onSessionEnd() {
  console.log("session ended");
  //remove layers?
}

function onSessionStart() {
  console.log("session started");
  // createQuadIU()
}

//functions to create scene objects
function customControls(camera, renderer) {
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.screenSpacePanning = false;
  controls.minDistance = 0.01;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI;
  controls.minPolarAngle = 0;

  console.log("camera roptation", camera.rotation)

  controls.keys = {
    LEFT: "KeyA", // Use 'A' key to rotate left
    UP: "KeyW", // Use 'W' key to rotate up
    RIGHT: "KeyD", // Use 'D' key to rotate right
    BOTTOM: "KeyS", // Use 'S' key to rotate down
  };
  return controls;
}

function customSkyCamera() {
  let camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 5); // Set the camera position to be above the ground
  camera.lookAt(new Vector3(0, 0, 0)); // Ensure the camera is looking at the origin

 // Ensure the camera is looking at a specific point
//  camera.lookAt(new Vector3(0, 0, 0));
  return camera;
}

function setupScene(scene) {
  const hemLight = new HemisphereLight(0x808080, 0x606060, 3);
  const light = new DirectionalLight(0xffffff, 3);
  scene.add(hemLight, light);
}

function customRenderer() {
  console.log("creating renderer from function ");
  let renderer = new WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.precision = "lowp";
  renderer.setClearAlpha(1);
  renderer.setClearColor(new Color(0), 0);
  renderer.xr.enabled = true;
  return renderer;
}

function customControllers(scene, renderer) {
  const controllerModelFactory = new XRControllerModelFactory();
  const handModelFactory = new XRHandModelFactory().setPath("./models/fbx/");

  const lineGeometry = new BufferGeometry().setFromPoints([
    new Vector3(0, 0, 0),
    new Vector3(0, 0, -10),
  ]);

  const line = new Line(
    lineGeometry,
    new LineBasicMaterial({ color: 0x5555ff })
  );
  line.renderOrder = 1;

  let controllers = [
    renderer.xr.getController(0),
    renderer.xr.getController(1),
  ];

  controllers.forEach((controller, i) => {
    const controllerGrip = renderer.xr.getControllerGrip(i);
    controllerGrip.add(
      controllerModelFactory.createControllerModel(controllerGrip)
    );
    scene.add(controllerGrip);

    const hand = renderer.xr.getHand(i);
    hand.add(handModelFactory.createHandModel(hand));

    controller.add(line.clone());
    //update raycast line visual when intersecting with objects
    controller.addEventListener("intersection", (e) => {
      controller.children[0].geometry = new BufferGeometry().setFromPoints([
        new Vector3(0, 0, 0),
        new Vector3(0, 0, e.data),
      ]);
    });
    scene.add(controller, controllerGrip, hand);
  });

  return controllers;
}

// classes for WebXR Layers
class WebXRCubeLayerASTC {
  constructor(faces, width, height, stereo) {
    this.layer = null;
    this.faces = faces;
    console.log("faces lenght", faces.length);
    this.stereo = stereo;
    this.format = 37808;
    this.width = width;
    this.height = height;
    this.type = "WebXRCubeLayerASTC";
  }

  // Method to create the WebXR layer
  createLayer(texture = this.Cube_Texture) {
    // if (!glBinding) { glBinding = getGLBinding() }
    // if (!xrSpace) { xrSpace = getXRSpace() }

    // if(!ASTC_EXT) { ASTC_EXT = getASTC() }
    // if(!ETC_EXT) { ETC_EXT = getETC()}

    this.layer = glBinding.createCubeLayer({
      space: xrSpace,
      viewPixelWidth: this.width,
      viewPixelHeight: this.height,
      layout: this.stereo ? "stereo" : "mono",
      colorFormat: 37808,
      isStatic: false,
    });
  }

  // Method to check if the layer is stereo
  isStereo() {
    return this.stereo;
  }
}

class WebXRCubeLayer {
  constructor(textures, width, height, stereo, format) {
    this.layer = null;
    this.textures = textures;
    this.stereo = stereo;
    this.format = format;
    this.width = width;
    this.height = height;
    this.type = "WebXRCubeLayer";
  }

  // Method to create the WebXR layer
  createLayer(texture = this.Cube_Texture) {
    // Logic to create the WebXR layer using this.active_Cube_Texture
    console.log("Creating WebXR layer with texture:", eval(this.format));
    console.log("height, widht", this.width, this.height);

    this.layer = glBinding.createCubeLayer({
      space: xrSpace,
      viewPixelWidth: this.width,
      viewPixelHeight: this.height,
      layout: this.stereo ? "stereo" : "mono",
      colorFormat: eval(this.format),
      isStatic: false,
    });
  }

  // Method to render the WebXR layer
  renderLayer() {
    // Logic to render the WebXR layer
    console.log("Rendering WebXR layer");
    // Example: someRenderFunction(this.cubeLayer);
  }

  // Method to check if the layer is stereo
  isStereo() {
    return this.stereo;
  }
}

class WebXREquirectangularLayer {
  constructor(textures, format, width, height, radius, stereo = false) {
    this.layer = null;
    this.textures = textures;
    this.format = format;
    this.height = height;
    this.width = width;
    this.radius = radius;
    this.stereo = stereo;
    this.type = "WebXREquirectangularLayer";
    console.log("is stereo? ", this.stereo);
  }

  // Method to create the WebXR layer
  createLayer() {
    // if (!glBinding) { glBinding = getGLBinding() }
    // if (!xrSpace) { xrSpace = getXRSpace() }
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

  // Method to render the WebXR layer
  renderLayer() {
    // Logic to render the WebXR layer
    console.log("Rendering WebXR layer");
    // Example: someRenderFunction(this.cubeLayer);
  }

  // Method to check if the layer is stereo
  isStereo() {
    return this.stereo;
  }
}

class WebXRQuadLayer {
  constructor(texture, format, height, width, stereo = false) {
    this.layer = null;
    this.texture = texture;
    this.format = format;
    this.type = "WebXRQuadLayer";
    this.stereo = stereo;
    this.height = height;
    this.width = width;
    //  console.log("viewPixelWidth, viewPixelHeight", texture.mipmaps[0].width, texture.mipmaps[0].height);
    //  console.log("Creating WebXR layer with texture:", texture.mipmaps[0].width, texture.mipmaps[0].height);
    console.log("format", this.format);

    // this.stereo = stereo;
    // this.radius = radius;
    // this.type = "WebXREquirectangularLayer";
  }

  // Method to create the WebXR layer
  createLayer(texture = this.texture) {
    //console.log("Creating quad with format:", this.format);

    console.log("Creating quad", this.width, this.height, this.format);

    this.layer = glBinding.createQuadLayer({
      space: xrSpace,
      viewPixelWidth: this.width,
      viewPixelHeight: this.height,
      layout: "mono",
      colorFormat: this.format,
    });

    this.layer.width = 10;
    this.layer.height = 10;
    let pos = { x: 0, y: 0, z: -10 };
    let orient = { x: 0, y: 0, z: 0, w: 1 };
    this.layer.transform = new XRRigidTransform(pos, orient);
  }

  // Method to check if the layer is stereo
  isStereo() {}
}

class WebXRQuadUILayer {
  constructor(
    image,
    name,
    width,
    height,
    depth,
    positionX,
    positionY,
    stereo = false
  ) {
    this.height = height;
    this.width = width;
    this.layer = null;
    this.depth = depth;
    this.stereo = stereo;
    this.positionX = positionX;
    console.log("positionX", positionX);
    this.positionY = positionY;

    // this.Equirectangular_Texture = Equirectangular_Texture;
    // this.stereo = stereo;
    // this.format = format;
    // this.radius = radius;
    this.image = image;
    this.type = "WebXRQuadUILayer";
    // this.type = "WebXREquirectangularLayer";
  }

  // Method to create the WebXR layer
  createLayer(image = this.image) {
    //    if (!glBinding) { glBinding = getGLBinding() }
    //    if (!xrSpace) { xrSpace = getXRSpace() }

    this.layer = glBinding.createQuadLayer({
      space: xrSpace,
      viewPixelWidth: image.width,
      viewPixelHeight: image.height / (this.stereo ? 2 : 1),
      layout: this.stereo ? "stereo-top-bottom" : "mono",
    });

    this.layer.width = this.width;
    this.layer.height = this.height;
    let pos = { x: this.positionX, y: this.positionY, z: this.depth };
    let orient = { x: 0, y: 0, z: 0, w: 1 };
    this.layer.transform = new XRRigidTransform(pos, orient);
  }

  // Method to check if the layer is stereo
  isStereo() {
    return this.stereo;
  }
}

class CubeLayer {
  constructor(faces, width, height, stereo) {
    this.layer = null;
    this.texture = null;
    this.faces = faces;
    this.stereo = stereo;
    this.format = 37808; // ASTC format
    this.width = width;
    this.height = height;
    this.type = "CubeLayer";
    this.loaded = false;
    // this.initializeTexture();
  }

  // initializeTexture() {
  //   const isVR = stateManager.getVRMode();
  //   const availableExtensions = stateManager.getAvailableExtensions();
  //   if (!isVR && !availableExtensions.WebXR) {
  //     this.createCubeTexture(this.faces);
  //   } else {
  //     // Handle other cases, e.g., VR mode or supported extensions
  //   }
  // }
  
  // createCubeTexture(urls){
  //   const loader = new CubeTextureLoader();
  //   loader.setPath( cdnPath + "/" );
    
  //   const textureCube = loader.load( [
  //     urls[0],
  //     urls[1],
  //     urls[2],
  //     urls[3],
  //     urls[4],
  //     urls[5]
  //   ] );
    
  //   this.texture = textureCube;
  //   // scene.background = textureCube;
    

  // }
  async loadAllImages() {
    let firstSixUrls = this.faces.slice(0, 6);
    await this.createCubeTexture(firstSixUrls);
    this.loaded = true;
    firstSixUrls = null;
  }

  createCubeTexture(urls) {
    return new Promise((resolve, reject) => {
      console.log("creating cubemap texture");
      let loader = new CubeTextureLoader();
      loader.setPath( cdnPath + "/" );
      loader.load(urls, (texture) => {
        this.texture = texture;
        this.texture.needsUpdate = true;
        resolve();
      }, undefined, (error) => {
        reject(error);
      });
    });
  }


  async loadKTX2Files() {}

  async loadAstcFiles() {
    // const response = await fetch(url);
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const arrayBuffer = await response.arrayBuffer();
    // var rawData = new Uint8Array(arrayBuffer);
    // console.log("rawData: ", rawData);
    // console.log("rawDataLength: ", rawData.Length);

    // // Create a DataView starting from byte offset 16
    // const astcData = new DataView(arrayBuffer, 16);

    // const width = 1536; // Width of the texture
    // const height = 1536; // Height of the texture
    // const format = 37808; //THREE.RGBA_ASTC_4x4_Format; // Use appropriate ASTC format

    // // Create a compressed texture
    // const compressedTexture = new CompressedTexture(
    //   [{ data: astcData, width, height }], // Mipmaps (can be an array of levels)
    //   width,
    //   height,
    //   format
    // );

    // compressedTexture.minFilter = LinearMipmapLinearFilter;
    // compressedTexture.magFilter = LinearFilter;
    // compressedTexture.needsUpdate = true;
  }

  // Method to create the WebXR layer
  createXRLayer(glBinding, xrSpace) {
    this.layer = glBinding.createCubeLayer({
      space: xrSpace,
      viewPixelWidth: this.width,
      viewPixelHeight: this.height,
      layout: this.stereo ? "stereo" : "mono",
      colorFormat: this.format,
      isStatic: false,
    });
  }

  // Method to create a Three.js texture
  createThreeTexture() {
    // Texture is already created in loadImages
  }

  // Method to check if the layer is stereo
  isStereo() {
    return this.stereo;
  }
}

class EquirectangularImage{
  constructor(srcArray, width, height, stereo) {
    this.type = "Equirectangular";
    this.layer = null;
    this.srcArray = srcArray; // Three.js equirectangular texture
    this.astcTexture = null; // Array of ASTC textures
    this.compressedTexture = null;
    this.stereo = stereo;
    this.width = width;
    this.height = height;
    this.texture = null;
    this.loaded = false;
    // this.initializeTexture();
  }



  // initializeTexture() {
  //   const isVR = stateManager.getVRMode();
  //   const availableExtensions = stateManager.getAvailableExtensions();
  //   if (!isVR && !availableExtensions.WebXR) {
  //     this.createEquirectangularTexture(this.src);
  //   } else {
  //     // Handle other cases, e.g., VR mode or supported extensions
  //   }
  // }
  
  // createEquirectangularTexture(url){
  //   console.log("creating equirectangular texture");
  //   let loader = new TextureLoader();
  //   loader.load(url, (texture) => {
  //     this.texture = texture;
  //     this.texture.mapping = EquirectangularReflectionMapping;
  //     this.texture.needsUpdate = true;
  //   });
  // }

  // async loadAllImages() {
  //    console.log("loading eqrt image from queue")
  //   await Promise.all(this.srcArray.map(url => this.createEquirectangularTexture(url)));
  //   this.loaded = true;
  // }

  async loadAllImages() {
    console.log("loading first equirectangular image from queue");
    if (this.srcArray.length > 0) {
      await this.createEquirectangularTexture(this.srcArray);
      this.loaded = true;
    }
  }

  createEquirectangularTexture(url) {
    return new Promise((resolve, reject) => {
      let loader = new TextureLoader();
      // loader.setPath(cdnPath + "/");
      loader.load(url, (texture) => {
        this.texture = texture;
        this.texture.mapping = EquirectangularReflectionMapping;
        this.texture.needsUpdate = true;
        resolve();
      }, undefined, reject);
    });
  }


  createASTCEquirectangularTexture(url){
    //if stereo we can either crop the texture in half or have seperate geometry uv mapped to only show half of the texture
  }


}



class StateManager {
  constructor() {
    if (StateManager.instance) {
      return StateManager.instance;
    }

    this.availableExtensions = {};
    this.isVR = false;
    this.isImmersiveSession = false;

    StateManager.instance = this;
  }

  setAvailableExtensions(extensions) {
    this.availableExtensions = extensions;
  }

  setVRMode(isVR) {
    this.isVR = isVR;
  }

  setImmersiveSession(isImmersive) {
    this.isImmersiveSession = isImmersive;
  }

  getAvailableExtensions() {
    return this.availableExtensions;
  }

  getVRMode() {
    return this.isVR;
  }

  getImmersiveSession() {
    return this.isImmersiveSession;
  }
}


class ImageManager {
  constructor() {
    if (ImageManager.instance) {
      return ImageManager.instance;
    }
    this.images = {};
    this.currentImage = null;
    ImageManager.instance = this;
  }

  addImage(name, imageInstance) {
    this.images[name] = imageInstance;
    downloadManager.addToQueue(imageInstance);
  }

  removeImage(name) {
    delete this.images[name];
  }

  selectImage(name) {
    if (this.images[name]) {
      this.currentImage = this.images[name];
      imageDisplayManager.displayImage(this.currentImage);
    } else {
      console.warn(`Image ${name} not found`);
    }
  }


  async createImageObjects(imageData){

    if(imageData.groupId in this.images){
      console.log("image already exists");
      return;
    }
    // console.log("creating image objects");
    if (imageData.format_360 === 'equirectangular') {

      let imageArr = JSON.parse(imageData.faces);
      let url = `${cdnPath}/${imageArr[0]}`;
      let equirectangularImage = new EquirectangularImage(url, imageData.width, imageData.height, false);
      this.addImage(imageData.groupId, equirectangularImage);

    
    
    
    }else if(imageData.format_360 === 'stereo_equirectangular'){
      let imageArr = JSON.parse(imageData.faces);
      let url = `${cdnPath}/${imageArr[0]}`;
      let equirectangularImage = new EquirectangularImage(url, imageData.width, imageData.height, true);
      this.addImage(imageData.groupId, equirectangularImage);

    
    } else if(imageData.format_360 === 'cubemap'){
    
    
      let faces = JSON.parse(imageData.faces);
      let cubeLayer = new CubeLayer(faces, imageData.width, imageData.height, false);
      this.addImage(imageData.groupId, cubeLayer);
    
    
    
    }else if(imageData.format_360 === 'stereo_cubemap'){
      let faces = JSON.parse(imageData.faces);
      let cubeLayer = new CubeLayer(faces, imageData.width, imageData.height, true);
      this.addImage(imageData.groupId, cubeLayer);

    }

  }
}


class ImageDisplayManager {
  constructor(scene) {
    this.scene = scene;
  }

  displayImage(image) {
    console.log("displaying image");
    if (stateManager.isVR) {
      image.createXRLayer(glBinding, xrSpace);
    } else {
      this.scene.background = image.texture;
    }
  }
}

class DownloadManager {
  constructor() {
    this.queue = [];
    this.activeDownloads = 0;
    this.maxConcurrentDownloads = 3; // Adjust as needed
  }

  addToQueue(imageInstance) {
    console.log(imageInstance, "added to queue");
    this.queue.push(imageInstance);
    this.processQueue();
  }

  prioritizeDownload(imageInstance) {
    // Move the prioritized image to the front of the queue
    this.queue = this.queue.filter(item => item !== imageInstance);
    this.queue.unshift(imageInstance);
    this.processQueue();
  }

  processQueue() {
    while (this.activeDownloads < this.maxConcurrentDownloads && this.queue.length > 0) {
      const imageInstance = this.queue.shift();
      this.activeDownloads++;
      imageInstance.loadAllImages().then(() => {
        this.activeDownloads--;
        this.processQueue();
      }).catch(() => {
        this.activeDownloads--;
        this.processQueue();
      });
    }
  }
}


const downloadManager = new DownloadManager();
const imageDisplayManager = new ImageDisplayManager(scene);
const imageManager = new ImageManager();
const stateManager = new StateManager();
window.imageManager = imageManager;
window.ThreeStateManager = stateManager;
window.imageDisplayManager = imageDisplayManager;
window.downloadManager = downloadManager;


export {imageManager, StateManager};



























// VR UI

function addFileManager() {
  let panel = document.getElementById("file-manager");
  vrui = new HTMLMesh(panel);
  vrui.position.x = -0.75;
  vrui.position.y = 1.5;
  vrui.position.z = -2;
  vrui.rotation.y = Math.PI / 4;
  vrui.scale.setScalar(4);
  group.add(vrui);
  window.vrui = vrui;
}

async function getRowGroup() {
  const fileManagerGrid = document.getElementById("file-manager_grid");
  if (fileManagerGrid) {
    const gridContent = fileManagerGrid.querySelector(".e-gridcontent");
    if (gridContent) {
      const rowGroups = gridContent.querySelectorAll('[role="rowgroup"]');
      console.log("rowgroups: ", rowGroups.length);
      if (rowGroups.length === 1) {
        rowGroup = rowGroups[0];
        window.rowGroup = rowGroup;
        console.log("rowGroup: ", rowGroup);
      }
    } else {
      console.error(
        'Element with classes "e-gridcontent e-lib e-touch" not found under file-manager_grid'
      );
    }
  } else {
    console.error('Element with id "file-manager_grid" not found');
  }
}

window.getRowGroup = getRowGroup;

function removeFileManager() {
  group.remove(vrui);
  vrui.geometry.dispose();
  vrui.material.map.dispose();
  vrui.material.dispose();
}

window.addFileManagerVR = addFileManager;
window.removeFileManager = removeFileManager;

let urls = [];
//make selecting directories work from breadcrumb bar in vr mode
function setBreadCrumb() {
  let breadCrumb = document.getElementById("file-manager_breadcrumbbar");
  let urlParent = breadCrumb.querySelector(".e-addressbar-ul");
  console.log("urlParent", urlParent);
  for (let i = 0; i < urlParent.children.length; i++) {
    urls[i] = urlParent.children[i];
    urlParent.children[i].addEventListener("click", () => {
      let clicky = urlParent.children[i].querySelector(".e-list-text");
      clicky.click();
    });
  }
}

window.links = urls;

window.setBreadCrumb = setBreadCrumb;

//     name: "Test_ASTC_Layer",
//     url: "./textures/ASTC/Forest/testpx.astc",
//     type: "quad",
//     height: 1536,
//     width: 1536,

async function loadInCompressedTexture(
  url = "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/px.astc"
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  var rawData = new Uint8Array(arrayBuffer);
  console.log("rawData: ", rawData);
  console.log("rawDataLength: ", rawData.Length);

  // Create a DataView starting from byte offset 16
  const astcData = new DataView(arrayBuffer, 16);

  const width = 1536; // Width of the texture
  const height = 1536; // Height of the texture
  const format = 37808; //THREE.RGBA_ASTC_4x4_Format; // Use appropriate ASTC format

  // Create a compressed texture
  const compressedTexture = new CompressedTexture(
    [{ data: astcData, width, height }], // Mipmaps (can be an array of levels)
    width,
    height,
    format
  );

  compressedTexture.minFilter = LinearMipmapLinearFilter;
  compressedTexture.magFilter = LinearFilter;
  compressedTexture.needsUpdate = true;

  // Use the texture in a material
  //   const material = new MeshStandardMaterial({
  //     map: compressedTexture,
  //   });

  //   // Apply material to a mesh
  //   const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
  //   mesh.position.set(0, 0, -5);
  //   scene.add(mesh);
}


let compressedDataUrls = [
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/px.astc",
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/nx.astc",
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/py.astc",
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/ny.astc",
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/pz.astc",
  "https://d1w8hynvb3moja.cloudfront.net/6c4904e89bc9d5879b444983ff15f08d/left/nz.astc",
];
async function loadInCompressedCubeMap(urls) {
    console.log('URLs passed to loadInCompressedCubeMap:', urls);
  
    if (!urls || !Array.isArray(urls)) {
      throw new Error('Invalid URLs array');
    }
  
    try {
      const promises = urls.map(async (url) => {
        console.log('Fetching URL:', url);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const rawData = new Uint8Array(arrayBuffer);
        console.log("rawData: ", rawData);
        console.log("rawDataLength: ", rawData.length);
  
        // Create a DataView starting from byte offset 16
        const astcData = new Uint8Array(arrayBuffer, 16); // Skip the ASTC header
  
        const width = 1536; // Width of the texture
        const height = 1536; // Height of the texture
        const format = 37808;//RGBA_ASTC_4x4_Format; // Use appropriate ASTC format
  
        return {
          data: astcData,
          width,
          height,
          format
        };
      });
  
      const facesData = await Promise.all(promises);
  
      console.log('Faces data:', facesData);
  
      const compressedTexture = new CompressedCubeTexture(
        facesData.map(face => ({
          mipmaps: [{ data: face.data, width: face.width, height: face.height }],
          width: face.width,
          height: face.height,
          format: face.format
        })),
        37808,
        UnsignedByteType
      );
  
    //   compressedTexture.minFilter = LinearMipmapLinearFilter;
    //   compressedTexture.magFilter = LinearFilter;
    //   compressedTexture.generateMipmaps = true;
      compressedTexture.needsUpdate = true;
  
      return compressedTexture;
    } catch (error) {
      console.error('Error loading compressed cube map:', error);
      throw error;
    }
  }
  
  // loadInCompressedCubeMap(compressedDataUrls).then((texture) => {
  //   // Use the texture
  //   console.log('CompressedCubeTexture loaded:', texture);
  //   scene.background = texture;
  // }).catch(error => {
  //   console.error('Error loading compressed cube map:', error);
  // });
  
  window.loadInCompressedCubeMap = loadInCompressedCubeMap;

