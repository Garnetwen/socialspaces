import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getArt } from "./getArt.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// 全局变量
let scene, myRenderer, camera, controls;
let imageMeshes = [];
let planeMesh;
let planeMeshes = [];
let meshContainer = new THREE.Group();
let planeMeshContainer = new THREE.Group();
let planesAndMeshesGroups = [];
let mouse;
let mouseIsDown = false;
let raycaster;
// let originalMat, activeMat;
let lastHoveredObject = null;
let interactionObjects = [];

function init() {
  // 创建 Three.js 场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color("rgb(200,100,200)");

  // 创建 WebGL 渲染器
  myRenderer = new THREE.WebGLRenderer();
  myRenderer.setSize(window.innerWidth, window.innerHeight);
  myRenderer.shadowMap.enabled = true; //turn on shadow
  document.body.appendChild(myRenderer.domElement);

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 15);
  camera.lookAt(0, 0, 0);

  // 使用 OrbitControls 方便调试
  controls = new OrbitControls(camera, myRenderer.domElement);

  // 添加网格辅助线
  let grid = new THREE.GridHelper(100, 100);
  scene.add(grid);

  // 添加灯光
  let dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.castShadow = true;
  dirLight.position.set(-10, 10, 10);

  scene.add(dirLight);
  let ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  let textureLoader = new THREE.TextureLoader();

  //background texture:
  let backgroundTex = textureLoader.load(
    "https://cdn.glitch.global/1d6bdc53-9fda-4286-a907-a1d0fb18fbf8/fish_hoek_beach_2k.jpg?v=1740411037447"
  );
  backgroundTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = backgroundTex;

  //add music
  let myAudioListener = new THREE.AudioListener();
  camera.add(myAudioListener);

  let sound = new THREE.PositionalAudio(myAudioListener);
  let audioLoader = new THREE.AudioLoader();
  let url =
    "https://cdn.glitch.global/1d6bdc53-9fda-4286-a907-a1d0fb18fbf8/sea-waves-169411.mp3?v=1740414852511";
  audioLoader.load(url, function (buffer) {
    sound.setBuffer(buffer);
    sound.setRefDistance(2);
    sound.setRolloffFactor(2);
    sound.play();
  });

  //create a sound box
  let soundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("rgb(100,100,0)") })
  );
  scene.add(soundMesh);
  soundMesh.add(sound);

  // 加载图片并开始动画
  loadModel();
  addArtworkToSpace();
  setupRaycaster();

  draw();

  // createPlane();
}

function loadModel() {
  // first create a loader
  let loader = new GLTFLoader();

  // then load the file and add it to your scene
  loader.load(
    "assets/cosmic-buddha-laser-scan-150k-gltf/cosmic-buddha-laser-scan-150k.gltf",
    function (gltf) {
      console.log("Model loaded:", gltf.scene);

      let model = gltf.scene;
      model.position.set(0, 0, -5);

      model.scale.set(0.01, 0.01, 0.01); // Scale down to a reasonable size

      scene.add(model);
    }
  );
}

// inactiveMat = new THREE.MeshBasicMaterial({ map: texture });

function setupRaycaster() {
  // add a raycast on click
  mouse = new THREE.Vector2(0, 0);
  document.addEventListener(
    "mousemove",
    (ev) => {
      // three.js expects 'normalized device coordinates' (i.e. between -1 and 1 on both axes)
      mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    },
    false
  );

  raycaster = new THREE.Raycaster();

  raycaster.layers.set(2);
  document.addEventListener("mousedown", (ev) => {
    mouseIsDown = true;
  });
  document.addEventListener("mouseup", (ev) => {
    mouseIsDown = false;
  });

  document.addEventListener("click", (ev) => {
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(planesAndMeshesGroups);

    // reset all materials
    for (let i = 0; i < planesAndMeshesGroups.length; i++) {
      planesAndMeshesGroups[i].material =
        planesAndMeshesGroups[i].userData.originalMaterial;
    }
    for (let i = 0; i < intersects.length; i++) {
      intersects[i].object.material = userData.activeMaterial;
    }
  });
  document.addEventListener("mousemove", (ev) => {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the new mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with objects
    const intersects = raycaster.intersectObjects(interactionObjects);

    let hoveredObject;
    if (intersects.length > 0) {
      hoveredObject = intersects[0].object;
    } else {
      hoveredObject = null;
    }

    if (hoveredObject !== lastHoveredObject) {
      if (lastHoveredObject)
        lastHoveredObject.material = lastHoveredObject.userData.originalMat; // Reset old hover
      if (hoveredObject)
        hoveredObject.material = hoveredObject.userData.activeMaterial; // Apply new hover
      console.log(hoveredObject.userData.activeMaterial);
    }
    lastHoveredObject = hoveredObject;
  });
}

async function addArtworkToSpace() {
  let artData = await getArt("buddha", 25);
  console.log("Total images received:", artData.length);

  // 过滤掉无效的图片 URL
  let validArtData = artData.filter((info) => info.imageUrl);
  console.log("Valid images:", validArtData.length);

  let gridSize = 5; // 5 列
  let numRows = 5; // 5 行
  let spacingX = 1.5; // 每个方块间距
  let spacingY = 1;

  let startX = -((gridSize - 1) * spacingX) / 2;
  let startY = ((numRows - 1) * spacingY) / 2 + 1; // 让 Y 轴方向从上往下排列

  for (let i = 0; i < 5; i++) {
    planesAndMeshesGroups[i] = new THREE.Group();
    interactionObjects[i] = new THREE.Group();
    planesAndMeshesGroups[i].position.set(i * 3, 0, 0);
    interactionObjects[i].position.set(i * 3, 0, 0);
    for (let e = 0; e < 5; e++) {
      let mesh = createMesh(validArtData[e].imageUrl);
      console.log(mesh);
      mesh.position.set(0, e * 1.3, 0);
      planesAndMeshesGroups[i].add(mesh);
      let interactMesh = createMesh(validArtData[e].imageUrl);
      interactMesh.position.set(0, e * 1.3, 0);
      interactMesh.layers.set(2);
      interactionObjects[i].add(interactMesh);
      interactionObjects[i].layers.set(2);

      mesh.userData.originalMaterial = mesh.material;
      mesh.userData.activeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 2,
      });
    }

    let geoPlane = new THREE.BoxGeometry(3, 0.1, 4);
    let matPlane = new THREE.MeshBasicMaterial();
    planeMesh = new THREE.Mesh(geoPlane, matPlane);
    planeMesh.position.set(0, -0.6, 0);
    planesAndMeshesGroups[i].add(planeMesh);
    scene.add(planesAndMeshesGroups[i]);
    scene.add(interactionObjects[i]);
  }
}

// 创建带有图片材质的立方体
function createMesh(imageUrl) {
  let geo = new THREE.BoxGeometry(1, 1, 1);
  let texture = new THREE.TextureLoader().load(imageUrl);
  // let mat = new THREE.MeshBasicMaterial({ map: texture });
  let originalMat = new THREE.MeshBasicMaterial({ map: texture });
  let mesh = new THREE.Mesh(geo, originalMat);
  mesh.userData.originalMaterial = originalMat;
  mesh.userData.activeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00, // Base color
    emissive: 0xffff00, // Glow color
    emissiveIntensity: 2, // Intensity of the glow
  });

  return mesh;
}

let frameCount = 0;
// 动画循环
function draw() {
  frameCount = frameCount + 1;
  controls.update();
  myRenderer.render(scene, camera);

  let speed = 0.02; // 滚动速度
  let gridSize = 5;
  let spacing = 2;
  let startX = -((gridSize - 1) * spacing) / 2;

  for (let i = 0; i < planesAndMeshesGroups.length; i++) {
    let posZ = 3 * Math.sin((frameCount + i * 40) / 50);
    planesAndMeshesGroups[i].position.y = posZ;
    interactionObjects[i].position.y = posZ;
  }

  // 请求下一帧动画

  window.requestAnimationFrame(draw);
}

// 启动程序
init();
