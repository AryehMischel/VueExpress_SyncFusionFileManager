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
  import { VRButton } from "three/addons/webxr/VRButton.js";
  import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
  import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";
  
  let scene, camera, renderer, cube;
  let VRControllers;
  
  function setupThreeJS(canvasId) {
    setupBasicScene(canvasId);
    //create vr hand controls with models
    VRControllers = customControllers(scene, renderer);
    console.log("VRControllers:", VRControllers);
    addCube();
    animate();
  }
  
  function animate(t, frame) {
    rotateCube();
  
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  
  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Scene Logic
  
  function setupBasicScene(canvasId) {
    scene = new Scene();
    camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    renderer = customRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById(canvasId).appendChild(renderer.domElement);
    camera.position.z = 5;
    // Set background color to light blue using RGB values
    scene.background = new Color("rgb(173, 216, 230)");
  
    // Add a directional light
    const light = new DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 5, 5);
    scene.add(light);
    //add VR button
    document.body.appendChild(VRButton.createButton(renderer));
  
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
  
  function addCube() {
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial({ color: 0x00ff00 });
    cube = new Mesh(geometry, material);
    scene.add(cube);
  }
  
  function rotateCube() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }
  
  window.setupThreeJS = setupThreeJS;
  
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
  
      //not sure if this is an effecient way to handle updated the controller selector line
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
  