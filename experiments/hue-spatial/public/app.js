import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const statusBadge = document.getElementById("statusBadge");
const modeBadge = document.getElementById("modeBadge");
const arButtonWrap = document.getElementById("arButtonWrap");
const roomSummary = document.getElementById("roomSummary");
const lightsList = document.getElementById("lightsList");
const logOutput = document.getElementById("logOutput");
const sessionResult = document.getElementById("sessionResult");
const visualizerWrap = document.getElementById("visualizerWrap");
const overlay = document.getElementById("overlay");
const overlayVisualizer = document.getElementById("overlayVisualizer");

const startRoomButton = document.getElementById("startRoom");
const undoRoomButton = document.getElementById("undoRoom");
const finishRoomButton = document.getElementById("finishRoom");
const startLightsButton = document.getElementById("startLights");
const undoLightButton = document.getElementById("undoLight");
const resetSessionButton = document.getElementById("resetSession");
const downloadSessionButton = document.getElementById("downloadSession");
const submitSessionButton = document.getElementById("submitSession");
const copyLogButton = document.getElementById("copyLog");
const openVisualizerButton = document.getElementById("openVisualizer");
const closeVisualizerButton = document.getElementById("closeVisualizer");
const ceilingHeightInput = document.getElementById("ceilingHeight");

const sessionState = {
  mode: "idle",
  roomPoints: [],
  lights: [],
  ceilingHeight: Number(ceilingHeightInput.value),
  logs: [],
  startedAt: new Date().toISOString(),
  roomMeshes: [],
  roomMarkers: [],
  lightMarkers: [],
};

const logEvent = (message, payload = {}) => {
  const entry = {
    time: new Date().toISOString(),
    message,
    payload,
  };
  sessionState.logs.push(entry);
  logOutput.textContent = sessionState.logs
    .slice(-120)
    .map((item) => `${item.time} | ${item.message}`)
    .join("\n");
};

const setStatus = (status, modeLabel) => {
  statusBadge.textContent = status;
  modeBadge.textContent = modeLabel;
};

const updateRoomSummary = () => {
  if (sessionState.roomPoints.length < 3) {
    roomSummary.textContent = "No room outline yet.";
    return;
  }
  const bounds = computeBounds(sessionState.roomPoints, sessionState.ceilingHeight);
  roomSummary.textContent = `Points: ${sessionState.roomPoints.length} | Bounds: x(${bounds.minX.toFixed(
    2
  )}–${bounds.maxX.toFixed(2)})m, z(${bounds.minZ.toFixed(2)}–${bounds.maxZ.toFixed(2)})m`;
};

const updateLightsList = () => {
  lightsList.innerHTML = "";
  sessionState.lights.forEach((light, index) => {
    const item = document.createElement("li");
    const input = document.createElement("input");
    input.value = light.name;
    input.addEventListener("input", (event) => {
      sessionState.lights[index].name = event.target.value;
      logEvent("light_renamed", { index, name: event.target.value });
      updateVisualizer();
    });
    const coords = document.createElement("span");
    coords.textContent = `(${light.position.x.toFixed(2)}, ${light.position.y.toFixed(
      2
    )}, ${light.position.z.toFixed(2)})m`;
    item.appendChild(input);
    item.appendChild(coords);
    lightsList.appendChild(item);
  });
};

const computeBounds = (points, ceilingHeight) => {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
    floorY: 0,
    ceilingY: ceilingHeight,
  };
};

const buildSessionPayload = () => {
  const bounds = sessionState.roomPoints.length >= 3 ? computeBounds(sessionState.roomPoints, sessionState.ceilingHeight) : null;
  return {
    started_at: sessionState.startedAt,
    room: {
      floor_points: sessionState.roomPoints,
      ceiling_height: sessionState.ceilingHeight,
      bounds,
    },
    lights: sessionState.lights,
    logs: sessionState.logs,
  };
};

let camera;
let scene;
let renderer;
let reticle;
let hitTestSource = null;
let hitTestRequested = false;

const roomGroup = new THREE.Group();
const lightGroup = new THREE.Group();

const initThree = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x222233, 1.2);
  scene.add(ambient);
  scene.add(roomGroup);
  scene.add(lightGroup);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00b5ff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  renderer.setAnimationLoop(render);
  window.addEventListener("resize", onWindowResize);
};

const createARButton = () => {
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test", "local-floor"],
    optionalFeatures: ["anchors", "plane-detection", "dom-overlay"],
    domOverlay: { root: document.body },
  });
  arButtonWrap.appendChild(button);

  renderer.xr.addEventListener("sessionstart", () => {
    setStatus("AR Active", sessionState.mode);
    logEvent("ar_session_started");
  });

  renderer.xr.addEventListener("sessionend", () => {
    setStatus("AR Ended", sessionState.mode);
    logEvent("ar_session_ended");
    hitTestSource = null;
    hitTestRequested = false;
  });

  const controller = renderer.xr.getController(0);
  controller.addEventListener("select", () => {
    if (!reticle.visible) return;
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(reticle.matrix);
    if (sessionState.mode === "room") {
      sessionState.roomPoints.push({ x: position.x, y: 0, z: position.z });
      addRoomMarker(position);
      updateRoomSummary();
      logEvent("room_point_added", { position });
      updateVisualizer();
    }
    if (sessionState.mode === "lights") {
      const lightIndex = sessionState.lights.length + 1;
      const light = {
        id: `light_${lightIndex}`,
        name: `Light ${lightIndex}`,
        position: { x: position.x, y: position.y, z: position.z },
      };
      sessionState.lights.push(light);
      addLightMarker(position);
      updateLightsList();
      logEvent("light_added", { light });
      updateVisualizer();
    }
  });
  scene.add(controller);
};

const addRoomMarker = (position) => {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x7ed6ff })
  );
  marker.position.copy(position);
  marker.position.y = 0.01;
  roomGroup.add(marker);
  sessionState.roomMarkers.push(marker);
};

const addLightMarker = (position) => {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd56a })
  );
  marker.position.copy(position);
  lightGroup.add(marker);
  sessionState.lightMarkers.push(marker);
};

const clearRoomMeshes = () => {
  sessionState.roomMeshes.forEach((mesh) => {
    roomGroup.remove(mesh);
    mesh.geometry.dispose();
  });
  sessionState.roomMeshes = [];
};

const buildRoomMeshes = () => {
  clearRoomMeshes();
  if (sessionState.roomPoints.length < 3) return;
  const points2d = sessionState.roomPoints.map((p) => new THREE.Vector2(p.x, p.z));
  const shape = new THREE.Shape(points2d);
  const floorGeometry = new THREE.ShapeGeometry(shape);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3a5d,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  roomGroup.add(floorMesh);
  sessionState.roomMeshes.push(floorMesh);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b4e7a,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const height = sessionState.ceilingHeight;
  const points = sessionState.roomPoints;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next.x - point.x;
    const dz = next.z - point.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const wallGeometry = new THREE.PlaneGeometry(length, height);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    const midpoint = new THREE.Vector3((point.x + next.x) / 2, height / 2, (point.z + next.z) / 2);
    wall.position.copy(midpoint);
    const angle = Math.atan2(dz, dx);
    wall.rotation.y = -angle;
    roomGroup.add(wall);
    sessionState.roomMeshes.push(wall);
  });
};

const render = (timestamp, frame) => {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    if (!hitTestRequested) {
      session.requestReferenceSpace("viewer").then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener("end", () => {
        hitTestRequested = false;
        hitTestSource = null;
      });
      hitTestRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
};

const onWindowResize = () => {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const resetSession = () => {
  sessionState.mode = "idle";
  sessionState.roomPoints = [];
  sessionState.lights = [];
  sessionState.logs = [];
  sessionState.startedAt = new Date().toISOString();
  sessionState.roomMarkers.forEach((marker) => marker.geometry.dispose());
  sessionState.lightMarkers.forEach((marker) => marker.geometry.dispose());
  sessionState.roomMarkers = [];
  sessionState.lightMarkers = [];
  roomGroup.clear();
  lightGroup.clear();
  clearRoomMeshes();
  updateLightsList();
  updateRoomSummary();
  logEvent("session_reset");
  setStatus("Idle", "Setup");
  updateVisualizer();
};

const startRoomMapping = () => {
  sessionState.mode = "room";
  setStatus("Mapping Room", "Room");
  logEvent("room_mapping_started");
};

const finishRoomMapping = () => {
  sessionState.ceilingHeight = Number(ceilingHeightInput.value) || 2.4;
  buildRoomMeshes();
  setStatus("Room Locked", "Room");
  logEvent("room_mapping_finished", { ceilingHeight: sessionState.ceilingHeight });
  updateRoomSummary();
  updateVisualizer();
};

const undoRoomPoint = () => {
  if (!sessionState.roomPoints.length) return;
  sessionState.roomPoints.pop();
  const marker = sessionState.roomMarkers.pop();
  if (marker) marker.geometry.dispose();
  updateRoomSummary();
  logEvent("room_point_removed");
  updateVisualizer();
};

const startLightMapping = () => {
  sessionState.mode = "lights";
  setStatus("Pinning Lights", "Lights");
  logEvent("light_mapping_started");
};

const undoLight = () => {
  if (!sessionState.lights.length) return;
  sessionState.lights.pop();
  const marker = sessionState.lightMarkers.pop();
  if (marker) marker.geometry.dispose();
  updateLightsList();
  logEvent("light_removed");
  updateVisualizer();
};

const downloadSession = () => {
  const payload = buildSessionPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hue_spatial_session_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  logEvent("session_downloaded");
};

const submitSession = async () => {
  const payload = buildSessionPayload();
  sessionResult.textContent = "Submitting session...";
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const result = await response.json();
    sessionResult.textContent = `Submitted. Session ID: ${result.session_id}`;
    logEvent("session_submitted", result);
  } catch (error) {
    sessionResult.textContent = "Failed to submit session.";
    logEvent("session_submit_failed", { error: error.message });
  }
};

const copyLog = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(sessionState.logs, null, 2));
    logEvent("log_copied");
  } catch (error) {
    logEvent("log_copy_failed", { error: error.message });
  }
};

const initVisualizer = (container) => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const vizScene = new THREE.Scene();
  vizScene.background = new THREE.Color(0x0a0f1a);
  const vizCamera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
  vizCamera.position.set(2.4, 2.2, 2.4);
  const vizRenderer = new THREE.WebGLRenderer({ antialias: true });
  vizRenderer.setSize(width, height);
  container.innerHTML = "";
  container.appendChild(vizRenderer.domElement);

  const grid = new THREE.GridHelper(6, 12, 0x2f3c55, 0x1c2435);
  vizScene.add(grid);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x223344, 1.1);
  vizScene.add(ambient);

  const roomPreview = new THREE.Group();
  const lightsPreview = new THREE.Group();
  vizScene.add(roomPreview);
  vizScene.add(lightsPreview);

  const controls = new OrbitControls(vizCamera, vizRenderer.domElement);
  controls.enableDamping = true;

  const update = () => {
    roomPreview.clear();
    lightsPreview.clear();

    if (sessionState.roomPoints.length >= 3) {
      const shape = new THREE.Shape(sessionState.roomPoints.map((p) => new THREE.Vector2(p.x, p.z)));
      const floorGeometry = new THREE.ShapeGeometry(shape);
      floorGeometry.rotateX(-Math.PI / 2);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d3a5d,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
      roomPreview.add(floorMesh);

      const height = sessionState.ceilingHeight;
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b4e7a,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const points = sessionState.roomPoints;
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x;
        const dz = next.z - point.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const wallGeometry = new THREE.PlaneGeometry(length, height);
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        const midpoint = new THREE.Vector3((point.x + next.x) / 2, height / 2, (point.z + next.z) / 2);
        wall.position.copy(midpoint);
        const angle = Math.atan2(dz, dx);
        wall.rotation.y = -angle;
        roomPreview.add(wall);
      });
    }

    sessionState.lights.forEach((light) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xffd56a })
      );
      marker.position.set(light.position.x, light.position.y, light.position.z);
      lightsPreview.add(marker);
    });
  };

  const animate = () => {
    controls.update();
    vizRenderer.render(vizScene, vizCamera);
    requestAnimationFrame(animate);
  };

  update();
  animate();

  return update;
};

let updateVisualizer = () => {};
let overlayUpdater = null;

const openVisualizerOverlay = () => {
  overlay.classList.remove("hidden");
  if (!overlayVisualizer.dataset.ready) {
    overlayUpdater = initVisualizer(overlayVisualizer);
    overlayVisualizer.dataset.ready = "true";
  }
  updateVisualizer();
};

const closeVisualizerOverlay = () => {
  overlay.classList.add("hidden");
};

let visualizerUpdater = null;

const init = () => {
  initThree();
  createARButton();

  visualizerUpdater = initVisualizer(visualizerWrap);
  updateVisualizer = () => {
    if (visualizerUpdater) visualizerUpdater();
    if (overlayUpdater) overlayUpdater();
  };

  resetSessionButton.addEventListener("click", resetSession);
  startRoomButton.addEventListener("click", startRoomMapping);
  undoRoomButton.addEventListener("click", undoRoomPoint);
  finishRoomButton.addEventListener("click", finishRoomMapping);
  startLightsButton.addEventListener("click", startLightMapping);
  undoLightButton.addEventListener("click", undoLight);
  downloadSessionButton.addEventListener("click", downloadSession);
  submitSessionButton.addEventListener("click", submitSession);
  copyLogButton.addEventListener("click", copyLog);
  openVisualizerButton.addEventListener("click", openVisualizerOverlay);
  closeVisualizerButton.addEventListener("click", closeVisualizerOverlay);
  ceilingHeightInput.addEventListener("change", () => {
    sessionState.ceilingHeight = Number(ceilingHeightInput.value) || 2.4;
    buildRoomMeshes();
    updateRoomSummary();
    updateVisualizer();
  });

  logEvent("app_loaded");
  setStatus("Idle", "Setup");
};

init();
