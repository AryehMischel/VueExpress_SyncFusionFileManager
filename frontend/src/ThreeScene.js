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
  CylinderGeometry,
  CanvasTexture,
  EquirectangularReflectionMapping,
  PerspectiveCamera,
  HemisphereLight,
  AmbientLight,
  DirectionalLight,
  PointLight,
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
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { HTMLMesh } from "three/examples/jsm/interactive/HTMLMesh.js";
import { InteractiveGroup } from "./jsm/interactive/InteractiveGroup.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import Logger from "./utils/logger";
let cdnPath = "https://d1w8hynvb3moja.cloudfront.net";
import { getMainStore } from "./store/main";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";

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

let IShighlighted = false;


window.GlobalHighlight = IShighlighted;

//vr ui stuff
let vrui;
let rowGroup;
let currSelectedItem = null;
window.currSelectedItem = currSelectedItem;

//utils
let logger = new Logger("ThreeScene", true);
let store;

//threejs consts for gl formats

let formats = {
  astc_4x4: 37808,
};

try {
  let layersPolyfill = new WebXRLayersPolyfill();
} catch {
  if ("xr" in navigator) {
    //weird. your device supports webxr but not the polyfill.
  } else {
    logger.log("WebXR is not supported on this device.");
  }
}

function initializeScene() {
  store = getMainStore();
  let vr = store.getIsVR;
  console.log("is vr?", vr);
  if (ASTC_EXT) {
    store.setASTC();
  }
  if (ETC_EXT) {
    store.setETC();
  }
}
window.initializeScene = initializeScene;

const stats = new Stats();
document.body.appendChild(stats.dom);

// to store WebXR Layers
let layers = new Object();
let activeLayers = [];

window.initializeScene = initializeScene;

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
renderer.xr.addEventListener("sessionstart", async () => {
  store.setImmersiveSession(true);
  addFileManagerVR();
  await new Promise((resolve) => setTimeout(resolve, 500));
  imageManager.processLayerQueue();
});
renderer.xr.addEventListener("sessionend", () =>
  store.setImmersiveSession(false)
);

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

// controllers[0].addEventListener('selectstart', onSelectStart);
// controllers[1].addEventListener('selectend', onSelectEnd);

// controllers[0].addEventListener('selectstart', onSelectStart);
// controllers[1].addEventListener('selectend', onSelectEnd);

function onSelectStart(event) {
  const controller = event.target;
  console.log("Select start", controller);
  // Add your custom logic here
}

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
  logger.log("ASTC_EXT", ASTC_EXT);
  // store.supportsASTC = true;
} else {
  logger.log("no astc");
  // store.supportsASTC = false;
}
if (ETC_EXT) {
  logger.log("ETC_EXT", ETC_EXT);
} else {
  logger.log("no etc");
}

//animation loop
function animate(t, frame) {
  const xr = renderer.xr;
  stats.update();
  const session = xr.getSession();
  xrSession = session;
  if (
    session &&
    session.renderState.layers !== undefined &&
    session.hasMediaLayer === undefined
  ) {
    logger.log("creating media layer");
    session.hasMediaLayer = true;
    session.requestReferenceSpace("local-floor").then((refSpace) => {
      glBinding = xr.getBinding();
      xrSpace = refSpace;
    });
  }

  //check active layers for redraw

  for (const key of imageManager.activeLayers) {
    const Image = imageManager.images[key];
    if (Image.layer.needsRedraw) {
      drawWebXRLayer(Image, session, frame);
    }
  }
  // for (let i = 0; i < activeLayers.length; i++) {
  //   if (activeLayers[i].layer.needsRedraw) {
  //     drawWebXRLayer(activeLayers[i], session, frame);
  //   }
  // }

  renderer.render(scene, camera);
  controls.update();
}

function drawWebXRLayer(layer, session, frame) {
  if (layer.type === "Equirectangular") {
    logger.log("drawing equirectangular layer");
    // if(layer.format === "ASTC") {
    drawCompressedWebXREquirectangularLayer(layer, frame);
  } else if (layer.type === "CubeMap") {
    logger.log("drawing CubeMap layer");
    drawCubeMapLayer(layer, frame);
  }

  // else if (layer.type === "WebXRCubeLayer") {
  //   drawWebXRCubeLayer(layer, session, frame);
  // } else if (layer.type === "WebXRQuadLayer") {
  //   drawWebXRQuadLayer(layer, session, frame);
  // } else if (layer.type === "WebXRQuadUILayer") {
  //   drawWebXRQuadUILayer(layer, session, frame);
  // }
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
    logger.log("add stereo support");
  }
}

function drawCubeMapLayer(layer, frame) {
  let format = formats[layer.format];
  let width = layer.width;
  let height = layer.height;

  if (!layer.stereo) {
    let glayer = glBinding.getSubImage(layer.layer, frame);
    bindCompressedCubeMap(glayer, layer.astcTextureData[0]);
  } else {
    let glayer = glBinding.getSubImage(layer.layer, frame, "left");
    bindCompressedCubeMap(glayer, layer.astcTextureData[0]);
    glayer = glBinding.getSubImage(layer.layer, frame, "right");
    bindCompressedCubeMap(glayer, layer.astcTextureData[1]);
  }

  function bindCompressedCubeMap(glayer, textures) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, glayer.colorTexture);

    const faces = [
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];

    for (let i = 0; i < faces.length; i++) {
      gl.compressedTexSubImage2D(
        faces[i],
        0,
        0,
        0,
        width,
        width,
        format,
        textures[i]
      );
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}

function drawCompressedWebXREquirectangularLayer(layer, frame) {
  let format = formats[layer.format]; //37808 //eval(layer.format);
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
    layer.astcTextureData
  );
  gl.bindTexture(gl.TEXTURE_2D, null);
}

//currently only handles compressed textures
function drawWebXRCubeLayer(layer, session, frame) {
  let format = eval(layer.format);
  logger.log("format is?", format);
  let width = layer.width;

  if (!layer.stereo) {
    logger.log("drawing cube layer");
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
  logger.log("drawing quad layer", height, width);

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
function createLayer(imagename) {
  let layer = layers[imagename];
  layer.createLayer();
}

function destroyLayer(imagename) {
  let layer = layers[imagename];
  layer.destroy();
}

function setLayer(layer) {
  // let layerLength = xrSession.renderState.layers.length;
  xrSession.updateRenderState({
    layers: [
      layer,
      xrSession.renderState.layers[xrSession.renderState.layers.length - 1],
    ],
  });
}

function onSessionEnd() {
  logger.log("session ended");
  //remove layers?
}

function onSessionStart() {
  logger.log("session started");
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

  logger.log("camera roptation", camera.rotation);

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
  const hemLight = new HemisphereLight(0x808080, 0x606060, 4);
  const dirLight = new DirectionalLight(0xffffff, 4);
  dirLight.position.set(5, 10, 7.5);
  dirLight.castShadow = true;

  const pointLight = new PointLight(0xffffff, 1, 100);
  pointLight.position.set(2, 3, 2);
  pointLight.castShadow = true;

  const ambientLight = new AmbientLight(0x404040, 3); // Add ambient light

  window.ambientLight = ambientLight;
  window.pointLight = pointLight;
  window.dirLight = dirLight;
  window.hemLight = hemLight;

  scene.add(hemLight);
  scene.add(dirLight);
  scene.add(pointLight);
  scene.add(ambientLight); // Add ambient light to the scene
}

function customRenderer() {
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
    logger.log("faces lenght", faces.length);
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
    logger.log("Creating WebXR layer with texture:", eval(this.format));
    logger.log("height, widht", this.width, this.height);

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
    logger.log("Rendering WebXR layer");
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
    logger.log("is stereo? ", this.stereo);
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
    logger.log("Rendering WebXR layer");
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
    //  logger.log("viewPixelWidth, viewPixelHeight", texture.mipmaps[0].width, texture.mipmaps[0].height);
    //  logger.log("Creating WebXR layer with texture:", texture.mipmaps[0].width, texture.mipmaps[0].height);
    logger.log("format", this.format);

    // this.stereo = stereo;
    // this.radius = radius;
    // this.type = "WebXREquirectangularLayer";
  }

  // Method to create the WebXR layer
  createLayer(texture = this.texture) {
    //logger.log("Creating quad with format:", this.format);

    logger.log("Creating quad", this.width, this.height, this.format);

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
    logger.log("positionX", positionX);
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
      logger.log("does this ever actually run?");
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
        logger.log("getting last six urls");
        let lastSixUrls = this.srcArray.slice(6, 12);
        await this.loadAstcTextures(
          lastSixUrls,
          this.width,
          this.height,
          formats[this.format]
        );
        lastSixUrls = null;
      } else {
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
      logger.warn("No element found with imageId:", this.id);
    }

    this.loaded = true;
  }

  async loadAstcCube(urls, width, height, format) {
    try {
      const promises = urls.map(async (url) => {
        logger.log("Fetching URL:", url);
        const response = await fetch(cdnPath + "/" + url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const rawData = new Uint8Array(arrayBuffer);
        logger.log("rawData: ", rawData);
        logger.log("rawDataLength: ", rawData.length);

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

      logger.log("Faces data:", facesData);

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
      logger.error("Error loading compressed cube map:", error);
      throw error;
    }
  }

  async loadAstcTextures(urls, width, height, format) {
    logger.log("getting last six urls");
    try {
      const promises = urls.map(async (url) => {
        logger.log("Fetching URL:", url);
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
      logger.log("ASTC Data Array:", astcDataArray);

      // Now you have the astcDataArray with the data in the order they were fetched
      this.astcTextureData[1] = astcDataArray;

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
      logger.error("Error loading compressed cube map:", error);
      throw error;
    }
  }

  async createCubeTexture(urls) {
    logger.log("urls without cdn", urls);
    let loader = new CubeTextureLoader();
    loader.setPath(cdnPath + "/");

    try {
      logger.log("CREATING CUBEMAP TEXTURE FROM IMAGES");
      const texture = await new Promise((resolve, reject) => {
        loader.load(urls, resolve, undefined, reject);
      });

      this.texture = texture;
      this.texture.needsUpdate = true;
      renderer.initTexture(this.texture);
    } catch (error) {
      logger.error("Error creating cubemap texture:", error);
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

class EquirectangularImage {
  constructor(srcArray, width, height, stereo, id, format) {
    this.type = "Equirectangular";
    this.layer = null;
    this.astcTextureData = null;
    this.srcArray = srcArray; // Three.js equirectangular texture
    this.astcTexture = null; // Array of ASTC textures
    this.compressedTexture = null;
    this.stereo = stereo;
    this.width = width;
    this.height = height;
    this.texture = null;
    this.loaded = false;
    this.id = id;
    this.format = format;
    this.radius = 20;
    // Validate the format parameter
    const allowedFormats = ["astc_4x4", "ktx2", "img"];
    if (!allowedFormats.includes(format)) {
      this.format = null;
      throw new Error(
        `Invalid format: ${format}. Allowed formats are: ${allowedFormats.join(
          ", "
        )}`
      );
    }

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
      logger.warn("No element found with imageId:", this.id);
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
          renderer.initTexture(this.texture);
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
      logger.log("rawData: ", rawData);
      logger.log("rawDataLength: ", rawData.length);

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

class ImageManager {
  constructor() {
    if (ImageManager.instance) {
      return ImageManager.instance;
    }
    this.images = {};
    this.imageOrder = []; // purely placeholder code for implementing demo. Order will have to track with syncfusion order by data
    this.currentImageIndex = 0;
    this.activeLayers = new Set();
    this.currentImage = null;
    this.XRlayerQueue = { "/": [] }; //{"/": [exampleLayer1, exampleLayer2], "/other": [exampleLayer3], "/other/nested": [exampleLayer4]}
    ImageManager.instance = this;
  }

  addImage(name, imageInstance) {
    this.images[name] = imageInstance;
    this.imageOrder.push(name);
    downloadManager.addToQueue(imageInstance);
  }

  selectNextImage() {
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
    delete this.images[name];
  }

  selectImage(name) {
    if (this.images[name]) {
      this.currentImage = this.images[name];

      console.log("is Immersive Session?", store.getImmersiveSession);
      console.log("has Layer?", this.images[name].layer);

      if (store.getImmersiveSession && this.images[name].layer) {
        if (!this.activeLayers.has(name)) {
          this.activeLayers.add(name);
        }
        if (scene.background) {
          logger.log("removing scene background");
          scene.background = null;
        }
        setLayer(this.images[name].layer);
      } else {
        imageDisplayManager.displayImage(this.currentImage);
      }
    } else {
      logger.warn(`Image ${name} not found`);
    }
  }

  async createImageObjects(imageData) {
    if (imageData.groupId in this.images) {
      if (store.getImmersiveSession && !this.images[imageData.groupId].layer) {
        console.log("creating layer for existing image");
        this.images[imageData.groupId].createXRLayer(glBinding, xrSpace);
      }

      logger.log("image already exists");

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
          logger.warn("No element found with imageId:", imageData.groupId);
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
      logger.log("creating cubemap of type", imageData.textureFormat);
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
      logger.log("creating cubemap of type", imageData.textureFormat);
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

  async processLayerQueue() {
    //check current image
    console.log("creating layers via queue...");
    // if (this.currentImage) {
    //   if (!this.currentImage.layer) {
    //     await this.currentImage.createXRLayer(glBinding, xrSpace);
    //     // this.selectImage(this.currentImage.id);
    //   }
    // }

    //check all images in the queue
    let cwd = store.currentWorkingDirectory;
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

class ImageDisplayManager {
  constructor(scene) {
    this.scene = scene;
  }

  displayImage(image) {
    logger.log("displaying image");
    if (store.supportsASTC) {
      logger.log("supports ASTC");
      if (image.compressedTexture) {
        this.scene.background = image.compressedTexture;
      } else {
        logger.log("no compressed texture found");
        if (image.texture) {
          this.scene.background = image.texture;
        } else {
          logger.log("no alt texture found");
        }
      }
    } else {
      logger.log("image", image);
      if (image.texture) {
        this.scene.background = image.texture;
      } else {
        logger.log("no texture found");
      }
    }
    // if (store.isVR) {
    //   image.createXRLayer(glBinding, xrSpace);
    // } else {
    //   this.scene.background = image.texture;
    // }
  }
}

class DownloadManager {
  constructor() {
    this.queue = [];
    this.activeDownloads = 0;
    this.maxConcurrentDownloads = 3; // Adjust as needed
  }

  addToQueue(imageInstance) {
    logger.log(imageInstance, "added to queue");
    this.queue.push(imageInstance);
    this.processQueue();
  }

  prioritizeDownload(imageInstance) {
    // Move the prioritized image to the front of the queue
    this.queue = this.queue.filter((item) => item !== imageInstance);
    this.queue.unshift(imageInstance);
    this.processQueue();
  }

  processQueue() {
    while (
      this.activeDownloads < this.maxConcurrentDownloads &&
      this.queue.length > 0
    ) {
      logger.log("processing next item in queue");
      const imageInstance = this.queue.shift();
      this.activeDownloads++;
      imageInstance
        .loadAllImages()
        .then(() => {
          this.activeDownloads--;
          this.processQueue();
        })
        .catch(() => {
          this.activeDownloads--;
          this.processQueue();
        });
    }
  }
}

const downloadManager = new DownloadManager();
const imageDisplayManager = new ImageDisplayManager(scene);
const imageManager = new ImageManager();
window.imageManager = imageManager;
window.imageDisplayManager = imageDisplayManager;
window.downloadManager = downloadManager;

export { imageManager };

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
      logger.log("rowgroups: ", rowGroups.length);
      if (rowGroups.length === 1) {
        rowGroup = rowGroups[0];
        window.rowGroup = rowGroup;
        logger.log("rowGroup: ", rowGroup);
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
  logger.log("urlParent", urlParent);
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
  logger.log("rawData: ", rawData);
  logger.log("rawDataLength: ", rawData.Length);

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
  logger.log("URLs passed to loadInCompressedCubeMap:", urls);

  if (!urls || !Array.isArray(urls)) {
    throw new Error("Invalid URLs array");
  }

  try {
    const promises = urls.map(async (url) => {
      logger.log("Fetching URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const rawData = new Uint8Array(arrayBuffer);
      logger.log("rawData: ", rawData);
      logger.log("rawDataLength: ", rawData.length);

      // Create a DataView starting from byte offset 16
      const astcData = new Uint8Array(arrayBuffer, 16); // Skip the ASTC header

      const width = 1536; // Width of the texture
      const height = 1536; // Height of the texture
      const format = 37808; //RGBA_ASTC_4x4_Format; // Use appropriate ASTC format

      return {
        data: astcData,
        width,
        height,
        format,
      };
    });

    const facesData = await Promise.all(promises);

    logger.log("Faces data:", facesData);

    const compressedTexture = new CompressedCubeTexture(
      facesData.map((face) => ({
        mipmaps: [{ data: face.data, width: face.width, height: face.height }],
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

    return compressedTexture;
  } catch (error) {
    logger.error("Error loading compressed cube map:", error);
    throw error;
  }
}

// loadInCompressedCubeMap(compressedDataUrls).then((texture) => {
//   // Use the texture
//   logger.log('CompressedCubeTexture loaded:', texture);
//   scene.background = texture;
// }).catch(error => {
//   logger.error('Error loading compressed cube map:', error);
// });

window.loadInCompressedCubeMap = loadInCompressedCubeMap;

async function loadCompressedEqrt() {
  let width = 1024;
  let height = 1024;
  let url = `${cdnPath}/73c135cc0dd834e59368ce6761536b16.astc`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const rawData = new Uint8Array(arrayBuffer);
    logger.log("rawData: ", rawData);
    logger.log("rawDataLength: ", rawData.length);

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
    const astcData = new DataView(bottomHalfData.buffer);

    // Create a compressed texture for the bottom half
    const compressedTexture = new CompressedTexture(
      [{ data: astcData, width, height: height / 2 }], // Mipmaps (can be an array of levels)
      width,
      height / 2,
      37808 // Use appropriate ASTC format
    );

    // // Create a DataView starting from byte offset 16
    // const astcData = new DataView(arrayBuffer, 16);

    // // Create a compressed texture
    // const compressedTexture = new CompressedTexture(
    //   [{ data: astcData, width, height }],
    //   width,
    //   height,
    //   37808
    // );

    compressedTexture.mapping = EquirectangularReflectionMapping;
    compressedTexture.needsUpdate = true;
    compressedTexture.generateMipmaps = true;
    scene.background = compressedTexture;
  } catch (error) {
    console.error("Error loading ASTC file:", error);
  }
}

function makeSceneBlue() {
  scene.background = new Color(0x0000ff);
}
window.makeSceneBlue = makeSceneBlue;
window.loadCompressedEqrt = loadCompressedEqrt;

function requestImmersiveSession() {}

function createXRLayerBeforeVRMode() {}

const loader = new GLTFLoader();
let animatedPath = "https://d368ik34cg55zg.cloudfront.net/sample.glb";

let arrowBaseMaterial;
let arrowNode;
let arrowHighlighted = false;



function unhighlight(){
  console.log("unhighlighting");
  highlightArrow(false);
}

window.GLOBALunlight = unhighlight;

function loadInArrows() {
  loader.load(
    animatedPath,
    function (gltf) {
      // Add a cylinder mesh for interactions
      const cylinderGeometry = new CylinderGeometry(0.5, 0.5, 2, 32);
      const cylinderMaterial = new MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
      });

      const interactionMesh1 = new Mesh(cylinderGeometry, cylinderMaterial);
      interactionMesh1.position.set(0, 0, -2);
      interactionMesh1.userData.interactive = true; // Mark as interactive
      group.add(interactionMesh1);

      const interactionMesh2 = new Mesh(cylinderGeometry, cylinderMaterial);
      interactionMesh2.position.set(2, 0, -2);
      interactionMesh2.userData.interactive = true; // Mark as interactive
      group.add(interactionMesh2);

      // Clone the model and add it as a child of the interaction mesh
      const model1 = gltf.scene.clone();
      model1.position.set(0, 0, 0); // Adjust position relative to the interaction mesh
      model1.rotation.z = -(Math.PI / 2);
      interactionMesh1.add(model1);

      const model2 = gltf.scene.clone();
      model2.position.set(0, 0, 0); // Adjust position relative to the interaction mesh
      model2.rotation.z = Math.PI / 2;
      interactionMesh2.add(model2);

      model1.traverse((child) => {
        if (child.isMesh) {
          console.log("Mesh:", child);
          console.log("Materials:", child.material);
          arrowNode = child;
          let clonedMaterial = child.material.clone();
          arrowBaseMaterial = clonedMaterial;
        }
      });


      // hoveron: { data: Vector2 };
      // pointerdown: { data: Vector2 };
      // pointerup: { data: Vector2 };
      // pointermove: { data: Vector2 };
      // mousedown: { data: Vector2 };
      // mouseup: { data: Vector2 };
      // mousemove: { data: Vector2 };
      // click: { data: Vector2 };

      // Add event listeners to the interaction meshes
      interactionMesh1.addEventListener("click", () => {
        console.log("clicked on model1 mesh");
      });
      interactionMesh1.addEventListener("hoveron", () => {
        console.log("hovered on model1 mesh");
      });
      interactionMesh1.addEventListener("hoveroff", () => {
        console.log("hovered off model1 mesh");
      });
      interactionMesh1.addEventListener("selectstart", () => {
        console.log("selectstart on model1 mesh");
      });
      interactionMesh1.addEventListener("selectend", () => {
        console.log("selectend on model1 mesh");
      });
      interactionMesh1.addEventListener("pointerup", () => {
        console.log("pointerup on model1 mesh");
      });
      interactionMesh1.addEventListener("pointermove", () => {
        console.log("pointermove on model1 mesh");
      });
      
      interactionMesh1.addEventListener("mousedown", () => {
        console.log("mousedown on model1 mesh");
      });
            
      interactionMesh1.addEventListener("mouseup", () => {
        console.log("mouseup on model1 mesh");
      });


      interactionMesh1.addEventListener("mousemove", () => {
        if(!GlobalHighlight){
          console.log("highlighting arrow")
          highlightArrow(true);
          GlobalHighlight = true;
        }
          
      });


      interactionMesh2.addEventListener("click", () => {
        console.log("clicked on model2 mesh");
      });
      interactionMesh2.addEventListener("hoveron", () => {
        console.log("hovered on model2 mesh");
      });
      interactionMesh2.addEventListener("hoveroff", () => {
        console.log("hovered off model2 mesh");
      });
      interactionMesh2.addEventListener("selectstart", () => {
        console.log("selectstart on model2 mesh");
      });
      interactionMesh2.addEventListener("selectend", () => {
        console.log("selectend on model2 mesh");
      });

      interactionMesh2.addEventListener("pointerup", () => {
        console.log("pointerup on model1 mesh");
      });
      interactionMesh2.addEventListener("pointermove", () => {
        console.log("pointermove on model1 mesh");
      });
      
      interactionMesh2.addEventListener("mousedown", () => {
        console.log("mousedown on model1 mesh");
      });
            
      interactionMesh2.addEventListener("mouseup", () => {
        console.log("mouseup on model1 mesh");
      });


      interactionMesh2.addEventListener("mousemove", () => {
        console.log("mouse moving over mesh");
      });

      // Simulate events for testing
      // setTimeout(() => {
      //   interactionMesh1.dispatchEvent({ type: "click" });
      //   interactionMesh1.dispatchEvent({ type: "hoveron" });
      //   interactionMesh1.dispatchEvent({ type: "hoveroff" });
      //   interactionMesh1.dispatchEvent({ type: "selectstart" });
      //   interactionMesh1.dispatchEvent({ type: "selectend" });
      //   interactionMesh2.dispatchEvent({ type: "click" });
      //   interactionMesh2.dispatchEvent({ type: "hoveron" });
      //   interactionMesh2.dispatchEvent({ type: "hoveroff" });
      //   interactionMesh2.dispatchEvent({ type: "selectstart" });
      //   interactionMesh2.dispatchEvent({ type: "selectend" });
      // }, 1000); // Delay to ensure models are added to the scene

      
      createCustomMaterial();
    },
    undefined,
    function (error) {
      console.error("An error occurred while loading the GLTF file:", error);
    }
  );


}

function addInteractiveBox() {
  let geometry = new BoxGeometry(1, 1, 1);
  let material = new MeshBasicMaterial({ color: 0x00ff00 });
  let cube = new Mesh(geometry, material);
  cube.position.set(0, 0, -3);
  cube.name = "interactiveCube";
  group.add(cube);
  cube.addEventListener("click", () => {
    console.log("clicked on cube");
  });

  cube.addEventListener("hoveron", () => {
    console.log("hovered on cube");
  });

  cube.addEventListener("hoveroff", () => {
    console.log("hovered off cube");
  });

  cube.addEventListener("selectstart", () => {
    console.log("selectstart on cube");
  });

  cube.addEventListener("selectend", () => {
    console.log("selectend on cube");
  });
}

window.addbox = addInteractiveBox;
window.loadInArrows = loadInArrows;

function createCustomMaterial() {
  let arrowShader = new CustomShaderMaterial({
    baseMaterial: arrowBaseMaterial,
    uniforms: {
      highlighted: { value: false }, // Add a uniform for highlighting
      edgeColor: { value: new Color(1, 0.27, 0.63) }, // Add a uniform for the color
    },

    vertexShader: vs,
    fragmentShader: fs,
  });

  arrowNode.material = arrowShader;

}


function highlightArrow(value) {
  arrowNode.material.uniforms.highlighted.value = value;
}



window.highlightArrow = highlightArrow;

window.createCustomMaterial = createCustomMaterial;

let vs = `
  varying vec2 vUv;
      uniform float brightness;
  void main() {
      vUv = uv;
  }
`;

let fs = `
  varying vec2 vUv;
  uniform bool highlighted;

      void main() {

      if(highlighted){
       
      if(csm_FragColor.g > 0.5){
        csm_FragColor = vec4(csm_FragColor.r, csm_FragColor.g, csm_FragColor.b, 1.0);
      }else{
         csm_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    }else{
    
    csm_FragColor = csm_FragColor;
    }
       csm_UnlitFac =  csm_UnlitFac;
  }
`;
