import {
  Scene,
  Texture,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector2,
  Mesh,
  BoxGeometry,
  CanvasTexture,
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

let eqrtRadius = 40; // radius for our webXR equirectangular layers

// to store WebXR Layers
let layers = new Object();
let activeLayers = [];

//Our html content that will be added to scene via HTMLMesh
const htmlContent = document.querySelector("#html-content");

//create scene, add lights
scene = new Scene();
setupScene(scene);

//create camera
camera = customSkyCamera();

//create renderer, add it to the dom and set animation loop
renderer = customRenderer();

document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(animate);

//add event listeners for the start and end of the xr session
renderer.xr.addEventListener("sessionstart", () => onSessionStart());
renderer.xr.addEventListener("sessionend", () => onSessionEnd());

//add vr button
document.body.appendChild(VRButton.createButton(renderer));


// if (navigator.xr) {
//     navigator.xr.requestSession('inline').then((session) => {
//       renderer.xr.setSession(session); // Attach the session to the renderer
//       console.log("Inline session started");
//     }).catch((err) => {
//       console.error("Failed to start inline session:", err);
//     });
//   } else {
//     console.warn("WebXR not supported");
//   }

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

//ktx2 sources for our webxr layers
let sources = [
  // { name: "Test_Quad_Layer", url: './textures/mountain.ktx2', type: "quad"},
  // { name: "Desert360_6k", url: './Desert360_6k.ktx2', type: "quad"},
];

let astcSources = [
  //   {
  //     name: "Test_ASTC_Layer",
  //     url: "./textures/ASTC/Forest/testpx.astc",
  //     type: "quad",
  //     height: 1536,
  //     width: 1536,
  //   },
  //nx.astc
  //  { id: "px_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/px.astc`], type: "quad", height: 400, width: 400 },
  //  { id: "nx_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/nx.astc`], type: "quad", height: 400, width: 400 },
  //  { id: "py_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/py.astc`], type: "quad", height: 400, width: 400 },
  //  { id: "ny_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/ny.astc`], type: "quad", height: 400, width: 400 },
  //  { id: "pz_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/pz.astc`], type: "quad", height: 400, width: 400 },
  //  { id: "nz_created_an_ecs", urls: [`${cdnPath}/a7a06e9e26348e3f9693b824f66936c6/nz.astc`], type: "quad", height: 400, width: 400 },
];

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

//supported compressed formats, get the name of format from three js constant
const supportedCompressedFormats = new Map([
  [36196, "etc.COMPRESSED_R11_EAC"],
  [37496, "etc.COMPRESSED_RGBA8_ETC2_EAC"],
  [37492, "etc.COMPRESSED_RGB8_ETC2"],
  [37808, "astc.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR"], //
  [37840, "astc.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR"], //'
  [1023, "gl.RGBA"],
]);

let offset2 = 0;

for (let i = 0; i < astcSources.length; i++) {
  createCompressedTextureLayerASTC(astcSources[i]);
  //   const response = await fetch(astcSources[i].url);
  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }
  //   const arrayBuffer = await response.arrayBuffer();
  //   var rawData = new Uint8Array(arrayBuffer);
  //   console.log("rawData: ", rawData);
  //   console.log("rawDataLength: ", rawData.Length);
  // // Create a DataView starting from byte offset 16
  // const dataView = new DataView(arrayBuffer, 16);
  //   let quadLayer = new WebXRQuadLayer(
  //     rawData,
  //     37808,
  //     astcSources[i].height,
  //     astcSources[i].width
  //   );
  //   layers[astcSources[i].name] = quadLayer;
  //   createButton(
  //     astcSources[i].name + " setup layer",
  //     () => {
  //       createLayer(astcSources[i].name);
  //     },
  //     0.8,
  //     offset2
  //   );
  //   createButton(
  //     astcSources[i].name + " add layer",
  //     () => {
  //       setLayer(astcSources[i].name);
  //     },
  //     0.2,
  //     offset2
  //   );
  //   offset2 += 0.2;
}

async function createCompressedTextureLayerASTC(image) {
  switch (image.type) {
    case "quad":
      console.log("initializing quad layer");
      createQuadLayerASTC(image);
      break;
    case "equirectangular":
      console.log("initializing equirectangular layer");
      break;
    case "cube":
      console.log("initializing cube layer");
      break;
    default:
      console.log("invalid layer type");
      break;
  }

  const response = await fetch(image.url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

let cubeMapFileExtensions = [
  "left/px.astc",
  "left/nx.astc",
  "left/py.astc",
  "left/ny.astc",
  "left/pz.astc",
  "left/nz.astc",
  "right/px.astc",
  "right/nx.astc",
  "right/py.astc",
  "right/ny.astc",
  "right/pz.astc",
  "right/nz.astc",
];

//cube map are stored as six image faces in the gpu compressed format COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR
let cubeMapSources = [
  // { id: "Desert", folder: `./textures/ASTC/Desert`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  //   { id: "Desert_Linear", folder: `./textures/ASTC/DesertLinear`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "Camping", folder: `${cdnPath}/Camping`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  //   { id: "CampingLinear", folder: `./textures/ASTC/CampingLinear`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "The Dragons Nest", folder: `./textures/ASTC/The Dragons Nest`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "Forest", folder: `Forest`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "Camping", folder: `Camping`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "FutureGarden", folder: `FutureGarden`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "Ocean", folder: `Ocean`, type: "stereoCubeMap", faces: [], width: 1536, height: 1536 },
  // { id: "BF", folder: `BF`, type: "stereoCubeMap", faces: [], width: 2048, height: 2048 },
];

let eqrtSourcesASTC = [
  {
    id: "exampleEqrt",
    type: "equirectangular",
    urls: [`${cdnPath}/desert.astc`],
    width: 6144,
    height: 3072,
  },
];

let eqrtSources = [
  {
    id: "exampleEqrt",
    type: "equirectangular",
    urls: [`${cdnPath}/Desert360_6k.jpg`],
    width: 6144,
    height: 3072,
  },
];

let loadAstcFileCounter = 0;

async function loadAstcFile(url) {
  loadAstcFileCounter++;
  console.log(`loadAstcFile called ${loadAstcFileCounter} times`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer, 16);
  return dataView;
}

async function loadFilesInFolder(source, fileExtensions) {
  const loadPromises = fileExtensions.map((extension) => {
    const fileUrl = `${source.folder}/${extension}`;
    return loadAstcFile(fileUrl);
  });

  const loadedFiles = await Promise.all(loadPromises);
  console.log(`All files in folder ${source.folder} are loaded`);
  // source.faces.push(loadedFiles);
  // console.log(`All files in folder ${source.folder} are loaded`);
  //create webxr stereo cube layer
  let layer = new WebXRCubeLayer(
    loadedFiles,
    source.width,
    source.height,
    true,
    37808
  );
  layers[source.id] = layer;
  createButton(
    source.id + " setup layer",
    () => {
      createLayer(source.id);
    },
    0.8,
    offset2
  );
  createButton(
    source.id + " add layer",
    () => {
      setLayer(source.id);
    },
    0.2,
    offset2
  );

  offset2 += 0.8;
}

async function loadAllFilesInFolders(sources, fileExtensions) {
  const folderPromises = sources.map((source) =>
    loadFilesInFolder(source, fileExtensions)
  );
  await Promise.all(folderPromises);
  // console.log('All files in all folders are loaded');
}

function createCubeLayersASTC() {
  // if (ASTC_EXT) {
  loadAllFilesInFolders(cubeMapSources, cubeMapFileExtensions)
    .then(() => {
      console.log("All files loaded successfully");
    })
    .catch((error) => {
      console.error("Error loading files:", error);
    });
  // }
}

async function createQuadLayerASTC(image) {
  let url = image.urls[0];
  console.log("image name: ", image.id);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  var rawData = new Uint8Array(arrayBuffer);
  console.log("rawData: ", rawData);
  console.log("rawDataLength: ", rawData.Length);

  // Create a DataView starting from byte offset 16
  const dataView = new DataView(arrayBuffer, 16);

  let quadLayer = new WebXRQuadLayer(
    dataView,
    37808,
    image.height,
    image.width
  );

  layers[image.id] = quadLayer;

  createButton(
    image.id + " setup layer",
    () => {
      createLayer(image.id);
    },
    0.8,
    offset2
  );
  createButton(
    image.id + " add layer",
    () => {
      setLayer(image.id);
    },
    0.2,
    offset2
  );
  offset2 += 0.5;
}

async function createEquirectangularLayerASTC(image_data = eqrtSourcesASTC[0]) {
  const response = await fetch(image_data.urls[0]);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const dataView = new DataView(arrayBuffer, 16);

  let stereoEquirectangularLayer = new WebXREquirectangularLayer(
    dataView,
    37808,
    image_data.width,
    image_data.height,
    20,
    false
  );
  layers[image_data.id] = stereoEquirectangularLayer;

  createButton(
    image_data.id + " setup layer",
    () => {
      createLayer(image_data.id);
    },
    0.8,
    0
  );
  createButton(
    image_data.id + " add layer",
    () => {
      setLayer(image_data.id);
    },
    0.2,
    0
  );
}

// createCubeLayersASTC();
// createEquirectangularLayerASTC();
// createQuadLayerASTC(eqrtSourcesASTC[0])

function createEquirectangularLayer(image_data = eqrtSources[0]) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = image_data.urls[0]; // URL of your image

  image.onload = () => {
    // Create a canvas element
    const canvas = document.createElement("canvas");
    canvas.width = image_data.width;
    canvas.height = image_data.height;

    // Get the 2D drawing context
    const context = canvas.getContext("2d");

    // Draw the image onto the canvas
    context.drawImage(image, 0, 0);

    // Get the image data (RGBA)
    const imageData = context.getImageData(0, 0, image.width, image.height);
    const rgbaData = imageData.data;

    console.log("RGBA data:", rgbaData);

    setTimeout(() => {
      // Now you can use the RGBA data as needed
      let equirectangularLayer = new WebXREquirectangularLayer(
        [rgbaData],
        "gl.RGBA",
        image_data.height,
        image_data.width,
        20,
        false
      );

      layers[image_data.id] = equirectangularLayer;
      createButton(
        image_data.id + " setup layer",
        () => {
          createLayer(image_data.id);
        },
        0.8,
        0
      );
      createButton(
        image_data.id + " add layer",
        () => {
          setLayer(image_data.id);
        },
        0.2,
        0
      );
    }, 2000);
  };
}

window.createEquirectangularLayerASTC = createEquirectangularLayerASTC;
window.createEquirectangularLayer = createEquirectangularLayer;
// createButton(
//   "spawn eqrt layer",
//   () => {
//     createEquirectangularLayer();
//   },
//   0.2,
//   -0.4
// );

//The compressed textures will be used to renderer 360 images on threejs meshe's outside the xr session
//The data in the compressed textures will be used for rendering our webxr layers (during xr sessions)
//the threejs meshes will be toggled on and off depending on the xr session state to keep the active media persistent as users enters or exits a session
for (let i = 0; i < sources.length; i++) {
  createCompressedTextureLayer(sources[i]); //,is createLayerFromCompressedTexture a better name?
}

let offset = 0;
//create a compressed texture and then create a webxr layer from that texture.
function createCompressedTextureLayer(image) {
  ktx2Loader.load(
    image.url,
    (texture) => {
      if (!ASTC_EXT && !ETC_EXT) {
        console.log("no compressed texture extensions available");
        return;
      }

      let format = texture.format;

      //just internally to keep track of the format type
      console.log("format type: ", supportedCompressedFormats.get(format));

      if (image.type === "quad") {
        console.log("initializing quad layer");

        let quadLayer = new WebXRQuadLayer(texture, format);
        layers[image.name] = quadLayer;

        //offset is for ui button placement in 3d space. Get rid of as soon as it's time ti implement real ui
        offset += 0.2;
        createButton(
          image.name + " setup layer",
          () => {
            createLayer(image.name);
          },
          0.8,
          offset
        );
        createButton(
          image.name + " add layer",
          () => {
            setLayer(image.name);
          },
          0.2,
          offset
        );
      }

      // IMAGE FORMAT VALIDATION.
      // if (texture.isCompressedCubeTexture) {
      //     VALIDATE CUBE TEXTURE
      // } else if (texture.isCompressedTexture) {
      //     VALIDATE EQUIRECTANGULAR TEXTURE
      // }
    },
    null,
    null
  );
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

  if (eqrtLayer && eqrtLayer.needsRedraw) {
    let glayer = glBinding.getSubImage(eqrtLayer, frame);
    // TEXTURE_CUBE_MAP expects the Y to be flipped for the faces and it already
    // is flipped in our texture image.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, glayer.colorTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      eqrtImageElement
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  renderer.render(scene, camera);
  controls.update();
}

function drawWebXRLayer(layer, session, frame) {
  if (layer.type === "WebXREquirectangularLayer") {
    // drawWebXREquirectangularLayer(layer, session, frame);
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

function createButton(name, callbackFunction, xOffset, yOffset) {
  let button = document.createElement("button");
  button.onclick = () => {
    callbackFunction();
  }; //{}
  button.innerText = `${name}`;
  button.style.zIndex = 1;
  button.className = "button";
  htmlContent.appendChild(button);

  // Create an HTMLMesh to attach the button to the plane
  let mesh = new HTMLMesh(button);
  mesh.position.x = -0.75 + xOffset;
  mesh.position.y = 1.5 + yOffset * 1.5;
  mesh.position.z = -0.5 + -xOffset * 4;
  mesh.rotation.y = Math.PI / 4;
  mesh.scale.setScalar(8);

  group.add(mesh);
}

function selectLayer(imagename) {
  if (layers[imagename]) {
    if (!layers[imagename].layer) {
      createLayer(imagename);
    }
    setLayer(imagename);
  } else {
    //handle
  }
}

//functions to replace classes

function customControls(camera, renderer) {
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.screenSpacePanning = false;
  controls.minDistance = 0.01;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2;

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
  camera.position.set(0, -3, 0);

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

// classes

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

let eqrtImagePath = "https://d1w8hynvb3moja.cloudfront.net/Desert360_6k.jpg";
let eqrtLayer = null;
let eqrtImageElement = null;
let eqrtIsStereo = false;
let eqrtIs180 = false;
let eqrtTextureWidth = 0;
let eqrtTextureHeight = 0;

function createEquirectLayer() {
  // Loading texture is async, create layer and update render state when done
  let imageElement = document.createElement("img");
  imageElement.src = eqrtImagePath;
  imageElement.crossOrigin = "anonymous";
  imageElement.onload = function () {
    eqrtTextureWidth = imageElement.width;
    eqrtTextureHeight = imageElement.height;
    eqrtImageElement = imageElement;
    eqrtLayer = glBinding.createEquirectLayer({
      space: xrSpace,
      viewPixelWidth: eqrtTextureWidth,
      viewPixelHeight: eqrtTextureHeight / (eqrtIsStereo ? 2 : 1),
      layout: eqrtIsStereo ? "stereo-top-bottom" : "mono",
    });

    eqrtLayer.centralHorizontalAngle = Math.PI * (eqrtIs180 ? 1 : 2);
    eqrtLayer.upperVerticalAngle = Math.PI / 2.0;
    eqrtLayer.lowerVerticalAngle = -Math.PI / 2.0;
    eqrtLayer.radius = eqrtRadius;
    xrSession.updateRenderState({
      layers: [
        eqrtLayer,
        xrSession.renderState.layers[xrSession.renderState.layers.length - 1],
      ],
    });
  };
}

window.createEquirectLayer = createEquirectLayer;

//function to be called with api response. everything. I mean everything needs to refactored after next check poiint
async function createEqrtLayer(name, url, width, height) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const dataView = new DataView(arrayBuffer, 16);

  let stereoEquirectangularLayer = new WebXREquirectangularLayer(
    dataView,
    37808,
    width,
    height,
    20,
    false
  );
  layers[name] = stereoEquirectangularLayer;

  offset += 0.5;
  createButton(
    name + " setup layer",
    () => {
      createLayer(name);
    },
    0.8,
    offset
  );
  createButton(
    name + " add layer",
    () => {
      setLayer(name);
    },
    0.2,
    offset
  );
}

// let stereoMockData = {name: "stereo-top-bottom", url: `${cdnPath}/stereoTopBottom.astc`, width: 1024, height: 1024}
let stereoMockData = {
  name: "stereo-top-bottom",
  url: `${cdnPath}/bf2Stereo.astc`,
  width: 8192,
  height: 8192,
};

async function createStereoEqrtLayer(
  name = stereoMockData.name,
  url = stereoMockData.url,
  width = stereoMockData.width,
  height = stereoMockData.height
) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const dataView = new DataView(arrayBuffer, 16);

  let stereoEquirectangularLayer = new WebXREquirectangularLayer(
    dataView,
    37808,
    width,
    height,
    20,
    true
  );
  layers[name] = stereoEquirectangularLayer;

  offset += 0.5;
  createButton(
    name + " setup layer",
    () => {
      createLayer(name);
    },
    0.8,
    offset
  );
  createButton(
    name + " add layer",
    () => {
      setLayer(name);
    },
    0.2,
    offset
  );
}

async function createEqrtLayerFromS3ObjectKey(
  name,
  s3Key,
  width,
  height,
  stereo = false
) {
  const url = `${cdnPath}/${s3Key}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const dataView = new DataView(arrayBuffer, 16);

  let stereoEquirectangularLayer = new WebXREquirectangularLayer(
    dataView,
    37808,
    width,
    height,
    20,
    stereo
  );
  layers[name] = stereoEquirectangularLayer;

  offset += 0.5;
  createButton(
    name + " setup layer",
    () => {
      createLayer(name);
    },
    0.8,
    offset
  );
  createButton(
    name + " add layer",
    () => {
      setLayer(name);
    },
    0.2,
    offset
  );
}

//setup to process data from dabase for stereo cubemaps
async function processDataFromS3ObjectKey(data) {
  //[{group_id: 1, group_name: 'Space Ring.png', face_index_map: {…}},...]

  for (let i = 0; i < data.length; i++) {
    let keys = Object.values(data[i].face_index_map);

    await createCubeLayersASTCFromS3ObjectKey(
      data[i].group_name,
      keys,
      data[i].width,
      data[i].height,
      true
    );
  }
}

async function createCubeLayersASTCFromS3ObjectKey(
  name,
  textureFiles,
  width,
  height,
  stereo = false
) {
  let srcs = [];

  console.log("textureFiles: ", textureFiles);

  for (let i = 0; i < textureFiles.length; i++) {
    const url = `${cdnPath}/${textureFiles[i]}?cacheBust=${Date.now()}`; // Add cache-busting query parameter
    console.log("fetching: ", url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const dataView = new DataView(arrayBuffer, 16);
      srcs[i] = dataView;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
    }
  }

  console.log("srcs: ", srcs);

  let layer = new WebXRCubeLayer(srcs, width, height, stereo, 37808);

  offset += 0.5;
  layers[name] = layer;
  createButton(
    name + " setup layer",
    () => {
      createLayer(name);
    },
    0.8,
    offset
  );
  createButton(
    name + " add layer",
    () => {
      setLayer(name);
    },
    0.2,
    offset
  );

  //offset += 0.8;
}

// offset += 0.5;
// createButton(
//   " spawn stereo eqrt layer",
//   () => {
//     createStereoEqrtLayer();
//   },
//   0.8,
//   offset
// );

window.createStereoEqrtLayer = createStereoEqrtLayer;
window.createEqrtLayer = createEqrtLayer;
window.createEqrtLayerFromS3ObjectKey = createEqrtLayerFromS3ObjectKey;
window.createCubeLayersASTCFromS3ObjectKey =
  createCubeLayersASTCFromS3ObjectKey;
window.processDataFromS3ObjectKey = processDataFromS3ObjectKey;

// START PROTOTYPING UI here

//files

let files = [
  { name: "Space Ring.png", imageId: 1 },
  { name: "Space Ring2.png", imageId: 2 },
  { name: "Space Ring3.png", imageId: 3 },
  { name: "Space Ring4.png", imageId: 4 },
  { name: "Space Ring5.png", imageId: 5 },
  { name: "Space Ring6.png", imageId: 6 },
  { name: "Space Ring7.png", imageId: 7 },
  { name: "Space Ring8.png", imageId: 8 },
  { name: "Space Ring9.png", imageId: 9 },
  { name: "Space Ring10.png", imageId: 10 },
  { name: "Space Ring11.png", imageId: 11 },
  { name: "Space Ring12.png", imageId: 12 },
  { name: "Space Ring13.png", imageId: 13 },
  { name: "Space Ring14.png", imageId: 14 },
  { name: "Space Ring15.png", imageId: 15 },
  { name: "Space Ring16.png", imageId: 16 },
  { name: "Space Ring17.png", imageId: 17 },
  { name: "Space Ring18.png", imageId: 18 },
  { name: "Space Ring19.png", imageId: 19 },
  { name: "Space Ring20.png", imageId: 20 },
];

let folders = [
  {
    name: "spring 2022",
    folderId: 1,
  },
  {
    name: "random misc 2022",
    folderId: 2,
  },
  {
    name: "my dude 2022",
    folderId: 3,
  },
];

//create mock ui;

let mockui;
let mockuiMesh;

function creatMockUI() {
  mockui = document.createElement("div");
  mockui.style.width = "300px";
  mockui.style.height = "400px";
  mockui.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  mockui.style.border = "2px solid #000";
  mockui.style.borderRadius = "10px";
  mockui.style.padding = "20px";
  mockui.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
  mockui.style.overflowY = "auto";

  let title = document.createElement("h2");
  title.innerText = "Mock UI";
  title.style.textAlign = "center";
  title.style.marginBottom = "20px";
  mockui.appendChild(title);

  let fileList = document.createElement("ul");
  fileList.style.listStyleType = "none";
  fileList.style.padding = "0";

  files.forEach((file) => {
    let listItem = document.createElement("li");
    listItem.innerText = file.name;
    listItem.style.padding = "10px";
    listItem.style.marginBottom = "10px";
    listItem.style.backgroundColor = "#f0f0f0";
    listItem.style.border = "1px solid #ccc";
    listItem.style.borderRadius = "5px";
    listItem.style.cursor = "pointer";
    listItem.addEventListener("click", () => {
      alert(`File selected: ${file.name}`);
    });
    fileList.appendChild(listItem);
  });

  mockui.appendChild(fileList);

  htmlContent.appendChild(mockui);

  // Create an HTMLMesh to attach the button to the plane
  mockuiMesh = new HTMLMesh(mockui);
  mockuiMesh.position.x = -0.75;
  mockuiMesh.position.y = 1.5;
  mockuiMesh.position.z = -0.5;
  mockuiMesh.rotation.y = Math.PI / 4;
  mockuiMesh.scale.setScalar(8);

  group.add(mockuiMesh);

  console.log("mockuiMesh", mockuiMesh);
  window.mockui = mockui;
}

window.creatMockUI = creatMockUI;

function updateMockUI() {
  mockui.style.backgroundColor = "rgba(221, 0, 0, 0.8)";
  // mockuiMesh.material.needsUpdate = true;
  // mockuiMesh.material.map.needsUpdate = true;
}

function scrollContentBy(x, y) {
  mockui.scrollTo({ top: 900, behavior: "smooth" });
  setTimeout(() => {
    mockui.style.backgroundColor = "rgba(221, 0, 0, 0.8)";
    mockuiMesh.material.needsUpdate = true;
    mockuiMesh.material.map.needsUpdate = true;
  }, 1000);
}

window.scrollContentBy = scrollContentBy;

/// create simple 2d mock ui

let fileManager;
let fileList;
let folderList;

function createPanel() {
  fileManager = document.createElement("div");
  fileManager.style.width = "300px";
  fileManager.style.height = "400px";
  fileManager.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
  fileManager.style.border = "2px solid #000";
  fileManager.style.borderRadius = "10px";
  fileManager.style.padding = "20px";
  fileManager.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
  fileManager.style.overflowY = "auto";

  let title = document.createElement("h2");
  title.innerText = "Mock UI";
  title.style.textAlign = "center";
  title.style.marginBottom = "20px";
  fileManager.appendChild(title);

  fileList = document.createElement("ul");
  fileList.style.listStyleType = "none";
  fileList.style.padding = "0";

  folderList = document.createElement("ul");
  folderList.style.listStyleType = "none";
  folderList.style.padding = "0";
  folderList.style.color = "blue";

  fileManager.appendChild(fileList);
  fileManager.appendChild(folderList);
  htmlContent.appendChild(fileManager);
}

function addRootFilesAndFolders(folders, files) {
  files.forEach((file) => {
    let listItem = document.createElement("li");
    listItem.innerText = file.name;
    listItem.style.padding = "10px";
    listItem.style.marginBottom = "10px";
    listItem.style.backgroundColor = "#f0f0f0";
    listItem.style.border = "1px solid #ccc";
    listItem.style.borderRadius = "5px";
    listItem.style.cursor = "pointer";
    listItem.addEventListener("click", () => {
      alert(`File selected: ${file.name}`);
    });
    fileList.appendChild(listItem);
  });

  folders.forEach((folder) => {
    let listItem = document.createElement("li");
    listItem.innerText = folder.name;
    listItem.style.padding = "10px";
    listItem.style.marginBottom = "10px";
    listItem.style.backgroundColor = "#f0f0f0";
    listItem.style.border = "1px solid #ccc";
    listItem.style.borderRadius = "5px";
    listItem.style.cursor = "pointer";
    listItem.addEventListener("click", () => {
      alert(`Folder selected: ${folder.name}`);
    });
    folderList.appendChild(listItem);
  });
}

//

// let cell;
// let clickly;
function addFileManager() {
  console.log("adding Syncfusion file manager");
  // Select the element by data-uid attribute
  const cell = document.querySelector('[data-uid="grid-row8"]');
  if (cell) {
    let vrui = new HTMLMesh(cell);
    vrui.position.x = -0.75;
    vrui.position.y = 1.5;
    vrui.position.z = -2;
    vrui.rotation.y = Math.PI / 4;
    vrui.scale.setScalar(4);
    group.add(vrui);

    // Emit a click event to the child elements
    //   const clickEvent = new MouseEvent('click', {
    //     view: window,
    //     bubbles: true,
    //     cancelable: true
    //   });

    //   // Dispatch the click event to each child element
    //   cell.querySelectorAll('*').forEach(child => {
    //     child.dispatchEvent(clickEvent);
    //   });

    // Manually dispatch the event to ensure it propagates correctly
    vrui.addEventListener("click", (event) => {
      cell.children[0].click();
    });
  } else {
    console.error('Element with data-uid="grid-row8" not found');
  }
}

let vrui;
let rowGroup;
function addFullManager() {
  const fileManagerGrid = document.getElementById("file-manager");
//   if (fileManagerGrid) {
//     const gridContent = fileManagerGrid.querySelector(
//       ".e-gridcontent.e-lib.e-touch"
//     );
//     if (gridContent) {
//       const rowGroups = gridContent.querySelectorAll('[role="rowgroup"]');
//       console.log("rowgroups: ", rowGroups.length);
//       if (rowGroups.length === 1) {
//         rowGroup = rowGroups[0];
//         console.log("rowGroup: ", rowGroup);
//       }
//     } else {
//       console.error(
//         'Element with classes "e-gridcontent e-lib e-touch" not found under file-manager_grid'
//       );
//     }
//   } else {
//     console.error('Element with id "file-manager_grid" not found');
//   }

//   if (rowGroup) {
    // const children = rowGroup.children;
    // console.log("Children: ", children.length);
    // for (let i = 0; i < children.length; i++) {
    //   children[i].addEventListener("click", (event) => {
    //     const targetElement = children[i].children[0];

    //     // Create and dispatch mousedown event
    //     const mouseDownEvent = new MouseEvent("mousedown", {
    //       view: window,
    //       bubbles: true,
    //       cancelable: true,
    //     });
    //     document.body.dispatchEvent(mouseDownEvent);

    //     // Create and dispatch mouseup event
    //     const mouseUpEvent = new MouseEvent("mouseup", {
    //       view: window,
    //       bubbles: true,
    //       cancelable: true,
    //     });
    //     document.body.dispatchEvent(mouseUpEvent);

    //     // Create and dispatch click event

    //     targetElement.click();

    //     let targ = getSelectedShit();
    //     console.log("targ", targ);

    //     if (targ === currSelectedItem) {
    //       openFile(targ);
    //     } else {
    //       currSelectedItem = targ;
    //     }
        //   document.body.classList = ""

        //children[i].children[0].dispatchEvent(mouseUpEvent);
    //   });
    // }

    // window.rowGroup = rowGroup;
//   }

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


async function getRowGroup(){
    const fileManagerGrid = document.getElementById("file-manager_grid");
    if (fileManagerGrid) {
      const gridContent = fileManagerGrid.querySelector(
        ".e-gridcontent"
      );
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


function testAdd(){
    const blueBox = document.createElement("div");
    blueBox.style.width = "100px";
    blueBox.style.height = "100px";
    blueBox.style.backgroundColor = "blue";
    rowGroup.appendChild(blueBox);
}
function forceReflow() {
    const element = document.getElementById("file-manager_grid");
    const styles = window.getComputedStyle(element);
    const width = styles.width;  // Just accessing computed styles forces reflow
    const height = styles.height;
    return { width, height };
  }
  
  // Force reflow on the element you are updating
 
  window.ref = forceReflow;
  window.testAdd = testAdd;

function addFileManagerSimple(){
  const panel = document.getElementById("file-manager");
  vrui = new HTMLMesh(panel);
  vrui.position.x = -0.75;
  vrui.position.y = 1.5;
  vrui.position.z = -2;
  vrui.rotation.y = Math.PI / 4;
  vrui.scale.setScalar(4);
  group.add(vrui);
  window.vrui = vrui;

}

window.add = addFileManagerSimple;

function removeFileManager() {
    group.remove(vrui);
    vrui.geometry.dispose();
    vrui.material.map.dispose();
    vrui.material.dispose();
  }
  

function refreshMesh() {
  vrui.material.map.needsUpdate = true;
  vrui.material.needsUpdate = true;
}

function removePanel() {
  vrui.geometry.dispose();
  vrui.material["map"].dispose(); // <- Error occurs here
  vrui.material["dispose"]();
}

window.removePanel = removePanel;
window.refresh = refreshMesh;

window.addFullManager = addFullManager;

// window.findCell = findCell;
// window.addCell = addCell;
window.addFileManager = addFileManager;
window.removeFileManager = removeFileManager;
window.addRootFilesAndFolders = addRootFilesAndFolders;

// createPanel();
// addRootFilesAndFolders(folders, files);



let vrMode = false;

window.vrMode = vrMode;

