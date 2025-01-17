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
  CubeTexture,
  CubeTextureLoader,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
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
import { getMainStore } from "./store/main";
import { GLTFLoader } from "./jsm/loaders/GLTFLoader.js";
import imageManager from "./three/managers/ImageManager";
import downloadManager from "./three/managers/DownloadManager";
import imageDisplayManager from "./three/managers/imageDisplayManager";
import webXRStore from "./store/WebXRStore";
import {formats} from "./three/config";
import {vs, fs} from "./three/shaders/shaders";
import { onWindowResize } from './three/utils/utils.js';
import {addFileManager, hideInteractiveElements, unhideInteractiveElements} from "./three/utils/vrUtils.js";

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


//vr ui stuff
let vrui;
let stats;
let rowGroup;
let currSelectedItem = null;
window.currSelectedItem = currSelectedItem;


//utils
let logger = new Logger("ThreeScene", true);
let store;




try {
  let layersPolyfill = new WebXRLayersPolyfill();
} catch {
  if ("xr" in navigator) {
    //weird. your device supports webxr but not the polyfill.
  } else {
    logger.log("WebXR is not supported on this device.");
  }
}

async function initializeScene() {
  store = getMainStore();

  if (ASTC_EXT) {
    store.setASTC();
  }
  if (ETC_EXT) {
    store.setETC();
  }

  //inject scene and store into managers (they are instantiated before scene or store is created)
  imageManager.setScene(scene);
  imageManager.setStore();
  imageDisplayManager.setScene(scene);
  imageDisplayManager.setStore();
}

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
  vrui = addFileManager(group);
  await new Promise((resolve) => setTimeout(resolve, 500));
  imageManager.processLayerQueue(glBinding, xrSpace);
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
if (controllers.length === 2) {
  group.listenToXRControllerEvents(controllers[1]);
} else {
  group.listenToXRControllerEvents(controllers[0]);
}
// group.listenToXRControllerEvents(controllers[1]);
scene.add(group);

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

//animation loop
function animate(t, frame) {
  const xr = renderer.xr;
  if(stats){
    stats.update();
  }
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

    webXRStore.setGLBinding(glBinding);
    webXRStore.setXRSpace(xrSpace);
    webXRStore.setXRSession(session);
  }

  //check active layers for redraw

  for (const key of imageManager.activeLayers) {
    const Image = imageManager.images[key];
    if (Image.layer.needsRedraw) {
      drawWebXRLayer(Image, session, frame);
    }
  }

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
  // let height = layer.height;

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



window.addEventListener("resize", () => onWindowResize(camera, renderer, logger), false);
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

  return camera;
}

function setupScene(scene) {
  //add lighting
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



    scene.add(controller, controllerGrip, hand);
  });

  return controllers;
}

function addStats() {
  document.body.appendChild(stats.dom);
}

window.imageDisplayManager = imageDisplayManager;
window.downloadManager = downloadManager;





const loader = new GLTFLoader();
let animatedPath = "https://d368ik34cg55zg.cloudfront.net/sample.glb";

let arrowBaseMaterialLeft;
let arrowBaseMaterialRight;

let rightArrowNode;
let leftArrowNode;

function highlightRightArrow() {
  rightArrowNode.material.uniforms.highlighted.value = true;
}

function highlightLeftArrow() {
  leftArrowNode.material.uniforms.highlighted.value = true;
}

function unhighlightLeftArrow() {
  leftArrowNode.material.uniforms.highlighted.value = false;
}

function unhighlightRightArrow() {
  rightArrowNode.material.uniforms.highlighted.value = false;
}


window.unhighlightLeftArrow = unhighlightLeftArrow;
window.unhighlightRightArrow = unhighlightRightArrow;
window.highlightLeftArrow = highlightLeftArrow;
window.highlightRightArrow = highlightRightArrow;

let interactionMesh1;
let interactionMesh2;

function loadInArrows() {
  loader.load(
    animatedPath,
    function (gltf) {
      // Add a cylinder mesh for interactions
      const cylinderGeometry = new CylinderGeometry(0.125, 0.125, 0.125, 32);

      const debugMaterial = new MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        opacity: 0.0,
        transparent: true,
      });



      interactionMesh1 = new Mesh(cylinderGeometry, debugMaterial.clone());
      interactionMesh1.position.set(-1.55, 1, -0.75);
      interactionMesh1.userData.name = "rightArrow";
      interactionMesh1.userData.interactive = true; // Mark as interactive

      interactionMesh2 = new Mesh(cylinderGeometry, debugMaterial.clone());
      interactionMesh2.position.set(-1.0, 1, -1.55);
      interactionMesh2.userData.name = "leftArrow";
      interactionMesh2.userData.interactive = true; // Mark as interactive

      // Clone the model and add it as a child of the interaction mesh
      const model1 = gltf.scene.clone();
      model1.position.set(0, 0, 0); // Adjust position relative to the interaction mesh
      model1.scale.set(0.25, 0.25, 0.25);
      model1.rotation.z = -(Math.PI / 2);
      model1.rotation.x = Math.PI / 2;
      interactionMesh1.add(model1);

      const model2 = gltf.scene.clone();
      model2.position.set(0, 0, 0); // Adjust position relative to the interaction mesh
      model2.scale.set(0.25, 0.25, 0.25);
      model2.rotation.z = -(Math.PI / 2);
      model2.rotation.x = Math.PI / 2;
      interactionMesh2.add(model2);

      interactionMesh1.rotation.z = 1.0;
      interactionMesh1.rotation.x = -1.5;

      interactionMesh2.rotation.z = -2.25;
      interactionMesh2.rotation.x = -1.5;

      // interactionMesh1.position.z = -0.5;
      // interactionMesh1.rotation.z = -0.5;

      model1.traverse((child) => {
        if (child.isMesh) {
          rightArrowNode = child;
          let clonedMaterialRight = child.material.clone();
          arrowBaseMaterialRight = clonedMaterialRight;
        }
      });

      model2.traverse((child) => {
        if (child.isMesh) {
          let clonedMaterialLeft = child.material.clone();
          leftArrowNode = child;
          arrowBaseMaterialLeft = clonedMaterialLeft;
        }
      });

      interactionMesh1.addEventListener("click", () => {
        imageManager.selectNextImage();
      });

      interactionMesh2.addEventListener("click", () => {
        imageManager.selectPreviousImage();
      });

      createCustomMaterial();

      window.ArrowLeft = interactionMesh2;
      window.ArrowRight = interactionMesh1;
    },
    undefined,
    function (error) {
      console.error("An error occurred while loading the GLTF file:", error);
    }
  );
}

let returnArrow;
let returnArrowPath = "https://d368ik34cg55zg.cloudfront.net/returnArrow.glb";
function loadInReturnArrow() {
  loader.load(
    returnArrowPath,
    function (gltf) {
      // Add a cylinder mesh for interactions
      const cylinderGeometry = new BoxGeometry(0.1, 0.3, 0.3);

      const debugMaterial = new MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        opacity: 0.0,
        transparent: true,
      });

      returnArrow = new Mesh(cylinderGeometry, debugMaterial);
      // returnArrow.rotation.x = Math.PI / 2;
      returnArrow.position.set(-1.5, 1, -1.5);
      returnArrow.userData.name = "returnArrow";
      returnArrow.userData.interactive = true; // Mark as interactivereturnArrow

      let model = gltf.scene;
      model.position.set(0, 0, 0); // Adjust position relative to the interaction mesh
      model.scale.set(0.1, 0.1, 0.1);
      model.rotation.x = Math.PI / 2;
      model.rotation.z = -(Math.PI / 2);
      returnArrow.add(model);

      returnArrow.rotation.y = -0.4;
      //scene.add(returnArrow);

      returnArrow.addEventListener("click", () => {
        swapUI();
      });

      window.returnArrow = returnArrow;
    },
    undefined,
    function (error) {
      console.error("An error occurred while loading the GLTF file:", error);
    }
  );
}

window.loadInReturnArrow = loadInReturnArrow;

loadInArrows();
loadInReturnArrow();

function swapUI() {

  if(!renderer.xr.isPresenting){
    console.log("not in vr");
    return;
  }
  if (vrui.visible) {
    hideInteractiveElements([vrui], group);
    unhideInteractiveElements([interactionMesh1, interactionMesh2, returnArrow], group);
  } else {
    hideInteractiveElements([interactionMesh1, interactionMesh2, returnArrow], group);
    unhideInteractiveElements([vrui], group);

  }
}

window.swapUI = swapUI;

window.loadInArrows = loadInArrows;

function createCustomMaterial() {
  let rightArrowShader = new CustomShaderMaterial({
    baseMaterial: arrowBaseMaterialRight,
    uniforms: {
      highlighted: { value: false }, // Add a uniform for highlighting
      edgeColor: { value: new Color(1, 0.27, 0.63) }, // Add a uniform for the color
    },

    vertexShader: vs,
    fragmentShader: fs,
  });

  let leftArrowShader = new CustomShaderMaterial({
    baseMaterial: arrowBaseMaterialLeft,
    uniforms: {
      highlighted: { value: false }, // Add a uniform for highlighting
      edgeColor: { value: new Color(1, 0.27, 0.63) }, // Add a uniform for the color
    },

    vertexShader: vs,
    fragmentShader: fs,
  });

  leftArrowNode.material = leftArrowShader;
  rightArrowNode.material = rightArrowShader;
}



 


function setDebug(debug){
  if(debug){
    stats = new Stats();
    document.body.appendChild(stats.dom);
  } else{
    if(stats){
      document.body.removeChild(stats.dom);
      stats = null;
    }
  }
  toggleTransparency([returnArrow, interactionMesh1, interactionMesh2], !debug);
}



function toggleTransparency(elements, transparency){
  elements.forEach(element => {
    element.material.transparent = transparency;
    element.material.opacity = transparency ? 0.0 : 1;
    element.material.needsUpdate = true;

  });
}


window.setDebug = setDebug;



export { scene, renderer };
