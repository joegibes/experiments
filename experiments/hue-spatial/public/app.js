import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const stepTitle = document.getElementById("stepTitle");
const stepHint = document.getElementById("stepHint");
const statusBadge = document.getElementById("statusBadge");
const modeBadge = document.getElementById("modeBadge");
const stepControls = document.getElementById("stepControls");
const prevStepButton = document.getElementById("prevStep");
const nextStepButton = document.getElementById("nextStep");
const logOutput = document.getElementById("logOutput");
const logPanel = document.getElementById("logPanel");
const toggleLogButton = document.getElementById("toggleLog");
const visualizerPanel = document.getElementById("visualizerPanel");
const toggleVisualizerButton = document.getElementById("toggleVisualizer");
const closeVisualizerButton = document.getElementById("closeVisualizer");
const downloadSessionButton = document.getElementById("downloadSession");
const submitSessionButton = document.getElementById("submitSession");
const sessionResult = document.getElementById("sessionResult");
const copyLogButton = document.getElementById("copyLog");
const visualizerWrap = document.getElementById("visualizerWrap");
const overlay = document.getElementById("overlay");
const overlayVisualizer = document.getElementById("overlayVisualizer");
const closeOverlayButton = document.getElementById("closeOverlay");
const arStage = document.getElementById("arStage");

const appVersion = "0.2.0";

const sessionState = {
  mode: "floor",
  floorLocked: false,
  floorY: 0,
  roomPoints: [],
  lights: [],
  ceilingHeight: 2.4,
  ceilingConfirmed: false,
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

const setStatus = (status) => {
  statusBadge.textContent = status;
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
    app_version: appVersion,
    started_at: sessionState.startedAt,
    metadata: {
      user_agent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      xr_supported: !!navigator.xr,
    },
    room: {
      floor_locked: sessionState.floorLocked,
      floor_y: sessionState.floorY,
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
let arButtonElement = null;

const roomGroup = new THREE.Group();
const lightGroup = new THREE.Group();

const initThree = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  arStage.appendChild(renderer.domElement);

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
  arButtonElement = button;

  renderer.xr.addEventListener("sessionstart", () => {
    setStatus("AR Active");
    logEvent("ar_session_started");
  });

  renderer.xr.addEventListener("sessionend", () => {
    setStatus("AR Ended");
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
      buildRoomMeshes();
      logEvent("room_point_added", { position });
      updateVisualizer();
      refreshStepUI();
    }
    if (sessionState.mode === "lights") {
      const lightIndex = sessionState.lights.length + 1;
      const light = {
        id: `light_${lightIndex}`,
        name: `Light ${lightIndex}`,
        position: { x: position.x, y: position.y - sessionState.floorY, z: position.z },
      };
      sessionState.lights.push(light);
      addLightMarker(position);
      logEvent("light_added", { light });
      updateVisualizer();
      refreshStepUI();
    }
  });
  scene.add(controller);
};

const setFloor = () => {
  if (!reticle.visible) return;
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(reticle.matrix);
  sessionState.floorY = position.y;
  sessionState.floorLocked = true;
  roomGroup.position.y = sessionState.floorY;
  setStatus("Floor Locked");
  logEvent("floor_locked", { floorY: sessionState.floorY });
  refreshStepUI();
};

const addRoomMarker = (position) => {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x7ed6ff })
  );
  marker.position.copy(position);
  marker.position.y = sessionState.floorY + 0.01;
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
    mesh.material.dispose();
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
        if (!sessionState.floorLocked) {
          setStatus("Floor Detected");
        }
      } else {
        reticle.visible = false;
      }
    }
  }
  if (setFloorButtonRef) {
    setFloorButtonRef.disabled = sessionState.floorLocked || !reticle.visible;
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
  sessionState.mode = "floor";
  sessionState.floorLocked = false;
  sessionState.floorY = 0;
  sessionState.roomPoints = [];
  sessionState.lights = [];
  sessionState.ceilingHeight = 2.4;
  sessionState.ceilingConfirmed = false;
  sessionState.logs = [];
  sessionState.startedAt = new Date().toISOString();
  sessionState.roomMarkers.forEach((marker) => marker.geometry.dispose());
  sessionState.lightMarkers.forEach((marker) => marker.geometry.dispose());
  sessionState.roomMarkers = [];
  sessionState.lightMarkers = [];
  roomGroup.clear();
  lightGroup.clear();
  clearRoomMeshes();
  roomGroup.position.y = 0;
  logEvent("session_reset");
  setStatus("Idle");
  updateVisualizer();
  refreshStepUI();
};

const undoRoomPoint = () => {
  if (!sessionState.roomPoints.length) return;
  sessionState.roomPoints.pop();
  const marker = sessionState.roomMarkers.pop();
  if (marker) {
    marker.geometry.dispose();
  }
  buildRoomMeshes();
  logEvent("room_point_removed");
  updateVisualizer();
  refreshStepUI();
};

const undoLight = () => {
  if (!sessionState.lights.length) return;
  sessionState.lights.pop();
  const marker = sessionState.lightMarkers.pop();
  if (marker) {
    marker.geometry.dispose();
  }
  logEvent("light_removed");
  updateVisualizer();
  refreshStepUI();
};

const confirmCeiling = (value) => {
  sessionState.ceilingHeight = Number(value) || 2.4;
  sessionState.ceilingConfirmed = true;
  buildRoomMeshes();
  logEvent("ceiling_confirmed", { ceilingHeight: sessionState.ceilingHeight });
  updateVisualizer();
  refreshStepUI();
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

const buildLightList = () => {
  const list = document.createElement("div");
  list.className = "list";
  sessionState.lights.forEach((light, index) => {
    const row = document.createElement("div");
    row.className = "list-row";
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
    row.appendChild(input);
    row.appendChild(coords);
    list.appendChild(row);
  });
  return list;
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
let visualizerUpdater = null;
let setFloorButtonRef = null;

const openOverlay = () => {
  overlay.classList.remove("hidden");
  if (!overlayVisualizer.dataset.ready) {
    overlayUpdater = initVisualizer(overlayVisualizer);
    overlayVisualizer.dataset.ready = "true";
  }
  updateVisualizer();
};

const closeOverlay = () => {
  overlay.classList.add("hidden");
};

const steps = [
  {
    id: "floor",
    title: "Scan Floor",
    hint: "Move your phone to find the floor plane, then tap “Set Floor”.",
    renderControls: () => {
      stepControls.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "controls";

      const setFloorButton = document.createElement("button");
      setFloorButtonRef = setFloorButton;
      setFloorButton.textContent = sessionState.floorLocked ? "Floor Locked" : "Set Floor";
      setFloorButton.disabled = sessionState.floorLocked || !reticle.visible;
      setFloorButton.addEventListener("click", setFloor);

      const resetButton = document.createElement("button");
      resetButton.className = "secondary";
      resetButton.textContent = "Reset Session";
      resetButton.addEventListener("click", resetSession);

      if (arButtonElement) wrapper.appendChild(arButtonElement);
      wrapper.appendChild(setFloorButton);
      wrapper.appendChild(resetButton);
      stepControls.appendChild(wrapper);
    },
    isComplete: () => sessionState.floorLocked,
  },
  {
    id: "room",
    title: "Outline Room",
    hint: "Tap around the room perimeter to create a floor outline.",
    renderControls: () => {
      stepControls.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "controls";

      const info = document.createElement("p");
      info.className = "muted";
      info.textContent = `Points: ${sessionState.roomPoints.length}`;

      const undoButton = document.createElement("button");
      undoButton.className = "secondary";
      undoButton.textContent = "Undo Point";
      undoButton.addEventListener("click", undoRoomPoint);

      wrapper.appendChild(info);
      wrapper.appendChild(undoButton);
      stepControls.appendChild(wrapper);
    },
    isComplete: () => sessionState.roomPoints.length >= 3,
  },
  {
    id: "ceiling",
    title: "Set Ceiling",
    hint: "Confirm the ceiling height so walls can be extruded correctly.",
    renderControls: () => {
      stepControls.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "controls";

      const field = document.createElement("label");
      field.className = "field";
      const label = document.createElement("span");
      label.textContent = "Ceiling height (meters)";
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.1";
      input.min = "2";
      input.max = "5";
      input.value = sessionState.ceilingHeight;
      field.appendChild(label);
      field.appendChild(input);

      const confirmButton = document.createElement("button");
      confirmButton.textContent = sessionState.ceilingConfirmed ? "Ceiling Confirmed" : "Confirm Ceiling";
      confirmButton.addEventListener("click", () => confirmCeiling(input.value));

      wrapper.appendChild(field);
      wrapper.appendChild(confirmButton);
      stepControls.appendChild(wrapper);
    },
    isComplete: () => sessionState.ceilingConfirmed,
  },
  {
    id: "lights",
    title: "Pin Lights",
    hint: "Tap each light fixture to drop a pin. Rename later in the review step.",
    renderControls: () => {
      stepControls.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "controls";

      const info = document.createElement("p");
      info.className = "muted";
      info.textContent = `Lights pinned: ${sessionState.lights.length}`;

      const undoButton = document.createElement("button");
      undoButton.className = "secondary";
      undoButton.textContent = "Undo Light";
      undoButton.addEventListener("click", undoLight);

      wrapper.appendChild(info);
      wrapper.appendChild(undoButton);
      stepControls.appendChild(wrapper);
    },
    isComplete: () => sessionState.lights.length >= 1,
  },
  {
    id: "review",
    title: "Review",
    hint: "Open the 3D view, download JSON, or submit the session log.",
    renderControls: () => {
      stepControls.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "controls";

      const summary = document.createElement("p");
      summary.className = "muted";
      summary.textContent = `Room points: ${sessionState.roomPoints.length} • Lights: ${sessionState.lights.length}`;

      const openButton = document.createElement("button");
      openButton.textContent = "Open 3D Visualizer";
      openButton.addEventListener("click", openOverlay);

      const downloadButton = document.createElement("button");
      downloadButton.className = "secondary";
      downloadButton.textContent = "Download JSON";
      downloadButton.addEventListener("click", downloadSession);

      const submitButton = document.createElement("button");
      submitButton.className = "primary";
      submitButton.textContent = "Submit Session";
      submitButton.addEventListener("click", submitSession);

      wrapper.appendChild(summary);
      if (sessionState.lights.length) {
        wrapper.appendChild(buildLightList());
      }
      wrapper.appendChild(openButton);
      wrapper.appendChild(downloadButton);
      wrapper.appendChild(submitButton);
      stepControls.appendChild(wrapper);
    },
    isComplete: () => true,
  },
];

let stepIndex = 0;

const refreshStepUI = () => {
  const step = steps[stepIndex];
  stepTitle.textContent = step.title;
  stepHint.textContent = step.hint;
  modeBadge.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
  sessionState.mode = step.id;

  step.renderControls();

  prevStepButton.disabled = stepIndex === 0;
  nextStepButton.disabled = !step.isComplete() || stepIndex === steps.length - 1;
  logEvent("step_viewed", { step: step.id });
};

const goToStep = (index) => {
  if (index < 0 || index >= steps.length) return;
  stepIndex = index;
  refreshStepUI();
};

const initVisualizerPanels = () => {
  visualizerUpdater = initVisualizer(visualizerWrap);
  updateVisualizer = () => {
    if (visualizerUpdater) visualizerUpdater();
    if (overlayUpdater) overlayUpdater();
  };
};

const init = () => {
  initThree();
  createARButton();
  initVisualizerPanels();

  prevStepButton.addEventListener("click", () => goToStep(stepIndex - 1));
  nextStepButton.addEventListener("click", () => goToStep(stepIndex + 1));

  toggleLogButton.addEventListener("click", () => {
    logPanel.classList.toggle("open");
  });

  toggleVisualizerButton.addEventListener("click", () => {
    visualizerPanel.classList.toggle("open");
    updateVisualizer();
  });

  closeVisualizerButton.addEventListener("click", () => {
    visualizerPanel.classList.remove("open");
  });

  downloadSessionButton.addEventListener("click", downloadSession);
  submitSessionButton.addEventListener("click", submitSession);
  copyLogButton.addEventListener("click", copyLog);
  closeOverlayButton.addEventListener("click", closeOverlay);

  logEvent("app_loaded", { appVersion });
  setStatus("Idle");
  refreshStepUI();
  window.hueSpatial = {
    sessionState,
    goToStep,
    refreshStepUI,
    openOverlay,
  };
};

init();
