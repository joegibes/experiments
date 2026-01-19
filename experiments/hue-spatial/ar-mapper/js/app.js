/**
 * AR Light Mapper - Application Logic
 */

// State Management
const state = {
    session: null,
    renderer: null,
    scene: null,
    camera: null,
    reticle: null,
    hitTestSource: null,
    localReferenceSpace: null,
    viewerReferenceSpace: null,

    // Mapping Data
    floorHeight: null,
    ceilingHeight: 2.44, // Default 8'
    pins: [], // Array of { id, mesh, relativePos: {x, y, z} }
    corners: [], // Array of { mesh, position: {x, y, z} } for room perimeter

    // UI state
    mode: 'intro', // intro, floor-setup, corner-mapping, pinning, results
    isDebugOpen: false,
    isTargeting: false,

    // Auto-floor detection
    autoFloorStartTime: null,
    autoFloorThreshold: 1000 // 1 second
};

// DOM Elements
const elements = {
    introScreen: document.getElementById('intro-screen'),
    arOverlay: document.getElementById('ar-overlay'),
    resultsScreen: document.getElementById('results-screen'),
    debugPanel: document.getElementById('debug-panel'),

    floorSetupPanel: document.getElementById('floor-setup-panel'),
    cornerMappingPanel: document.getElementById('corner-mapping-panel'),
    pinningPanel: document.getElementById('pinning-panel'),

    startBtn: document.getElementById('start-ar-btn'),
    exitBtn: document.getElementById('exit-ar-btn'),
    toggleDebugBtn: document.getElementById('toggle-debug-btn'),
    closeDebugBtn: document.getElementById('close-debug-btn'),

    setFloorBtn: document.getElementById('set-floor-manual-btn'),
    skipFloorBtn: document.getElementById('skip-floor-btn'),

    // Ceiling setup
    ceilingSetupPanel: document.getElementById('ceiling-setup-panel'),
    setCeilingBtn: document.getElementById('set-ceiling-btn'),
    skipCeilingBtn: document.getElementById('skip-ceiling-btn'),
    measuredCeilingHeight: document.getElementById('measured-ceiling-height'),
    ceilingBackBtn: document.getElementById('ceiling-back-btn'),

    // Corner mapping
    undoCornerBtn: document.getElementById('undo-corner-btn'),
    doneCornersBtn: document.getElementById('done-corners-btn'),
    skipCornersBtn: document.getElementById('skip-corners-btn'),
    cornerCount: document.getElementById('corner-count'),
    cornerBackBtn: document.getElementById('corner-back-btn'),

    // Pinning
    pinningBackBtn: document.getElementById('pinning-back-btn'),

    undoPinBtn: document.getElementById('undo-pin-btn'),
    finishBtn: document.getElementById('finish-btn'),

    pinCount: document.getElementById('pin-count'),
    heightVal: document.querySelector('.height-value'),

    jsonOutput: document.getElementById('json-output'),
    copyJsonBtn: document.getElementById('copy-json-btn'),
    downloadJsonBtn: document.getElementById('download-json-btn'),
    newSessionBtn: document.getElementById('new-session-btn'),

    // Debug info
    debugFloor: document.getElementById('debug-floor-height'),
    debugCeiling: document.getElementById('debug-ceiling-height'),
    debugPinCount: document.getElementById('debug-pin-count'),
    debugCamHeight: document.getElementById('debug-cam-height'),
    debugPinsList: document.getElementById('debug-pins-list'),

    ceilingInput: document.getElementById('ceiling-height'),
    toastContainer: document.getElementById('toast-container'),
    visualizerMount: document.getElementById('visualizer-mount')
};

// Initialize the app
async function init() {
    setupEventListeners();
    setupThreeJS(); // Initialize 3D engine early
    checkARSupport();
}

function checkARSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (!supported) {
                showStatus('AR not supported on this device', true);
                elements.startBtn.disabled = true;
            }
        });
    } else {
        showStatus('WebXR not found. Use Chrome on Android.', true);
        elements.startBtn.disabled = true;
    }
}

function setupEventListeners() {
    elements.startBtn.addEventListener('click', startAR);
    elements.exitBtn.addEventListener('click', endAR);
    elements.toggleDebugBtn.addEventListener('click', () => setDebugPanel(true));
    elements.closeDebugBtn.addEventListener('click', () => setDebugPanel(false));

    elements.setFloorBtn.addEventListener('click', () => setFloor());
    elements.skipFloorBtn.addEventListener('click', () => setFloor(0)); // Assume origin is floor

    // Back buttons
    elements.cornerBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Clear corners and go back to floor setup
        state.corners.forEach(c => {
            state.scene.remove(c.mesh);
            if (c.mesh.userData.line) state.scene.remove(c.mesh.userData.line);
        });
        state.corners = [];
        updateCornerCount();
        setMode('floor-setup');
        showToast('Back to floor setup');
    });

    elements.ceilingBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Go back to corner mapping
        setMode('corner-mapping');
        showToast('Back to room outline');
    });

    elements.pinningBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Go back to ceiling
        setMode('ceiling-setup');
        showToast('Back to ceiling setup');
    });

    // Ceiling setup buttons
    elements.setCeilingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmCeiling();
    });
    elements.skipCeilingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.ceilingHeight = 2.44; // Default
        setMode('pinning');
        showToast('Using default ceiling height (2.44m)');
    });

    // Corner mapping buttons
    elements.undoCornerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoCorner();
    });
    elements.doneCornersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        finishCorners();
    });
    elements.skipCornersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setMode('pinning');
        showToast('Skipped room outline');
    });

    // Fix Undo bug: Stop propagation on buttons
    elements.undoPinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoLastPin();
    });

    // Safety check for Finish button
    elements.finishBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showResults(); // No confirmation needed
    });

    elements.copyJsonBtn.addEventListener('click', copyToClipboard);
    elements.downloadJsonBtn.addEventListener('click', downloadJSON);
    elements.newSessionBtn.addEventListener('click', () => window.location.reload());

    // Handle taps - IGNORE button clicks
    window.addEventListener('click', (e) => {
        // If clicking a button or UI element, ignore
        if (e.target.closest('button') || e.target.closest('.action-btn') || e.target.closest('.icon-btn') || e.target.closest('.debug-panel')) return;

        if (state.mode === 'floor-setup' && state.isTargeting) {
            setFloor();
        } else if (state.mode === 'ceiling-setup' && state.isTargeting) {
            measureCeiling();
        } else if (state.mode === 'corner-mapping' && state.isTargeting) {
            placeCorner();
        } else if (state.mode === 'pinning' && state.isTargeting) {
            placePin();
        }
    });
}

function showStatus(msg, isError = false) {
    const status = document.getElementById('ar-status');
    status.textContent = msg;
    status.classList.add('visible');
    if (isError) status.classList.add('error');
    else status.classList.remove('error');
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Haptic feedback
function haptic(pattern = 'short') {
    if (!navigator.vibrate) return;

    switch (pattern) {
        case 'short':
            navigator.vibrate(50);
            break;
        case 'medium':
            navigator.vibrate(100);
            break;
        case 'double':
            navigator.vibrate([50, 50, 50]);
            break;
        case 'success':
            navigator.vibrate([50, 100, 100]);
            break;
        default:
            navigator.vibrate(50);
    }
}

// Plane detection VFX: radiating particles
function createPlaneDetectedVFX(position) {
    const numParticles = 12;
    const particles = [];

    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        const geom = new THREE.SphereGeometry(0.008, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(geom, mat);
        particle.position.set(position.x, position.y, position.z);
        particle.userData.angle = angle;
        particle.userData.startTime = performance.now();
        state.scene.add(particle);
        particles.push(particle);
    }

    // Animate particles
    function animateParticles() {
        const now = performance.now();
        let allDone = true;

        particles.forEach((p, i) => {
            const elapsed = now - p.userData.startTime;
            const duration = 600;
            const progress = Math.min(1, elapsed / duration);

            if (progress < 1) {
                allDone = false;
                const radius = progress * 0.3;
                const angle = p.userData.angle;
                p.position.x = position.x + Math.cos(angle) * radius;
                p.position.z = position.z + Math.sin(angle) * radius;
                p.material.opacity = 1 - progress;
                p.scale.setScalar(1 + progress * 2);
            } else {
                state.scene.remove(p);
            }
        });

        if (!allDone) {
            requestAnimationFrame(animateParticles);
        }
    }

    animateParticles();
}

// Debug: Capture console output to screen
const debugConsole = document.createElement('div');
debugConsole.style.cssText = 'position:fixed;top:0;left:0;right:0;height:100px;overflow:auto;background:rgba(0,0,0,0.8);color:#fff;font-size:10px;z-index:9999;pointer-events:none;padding:5px;';
document.body.appendChild(debugConsole);

function logToScreen(msg, type = 'log') {
    const line = document.createElement('div');
    line.style.color = type === 'error' ? '#ff5555' : '#ffffff';
    line.textContent = `[${type}] ${msg}`;
    debugConsole.appendChild(line);
    debugConsole.scrollTop = debugConsole.scrollHeight;
}

const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { originalLog(...args); logToScreen(args.join(' ')); };
console.error = (...args) => { originalError(...args); logToScreen(args.join(' '), 'error'); };

// AR Session Management
// AR Session Management
async function startAR() {
    state.ceilingHeight = parseFloat(elements.ceilingInput.value) || 2.44;

    try {
        console.log('Requesting AR Session...');

        // Check if immersive-ar is supported first
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isSupported) {
            throw new Error('immersive-ar not supported on this device');
        }

        // Request session with DOM Overlay
        const sessionInit = {
            requiredFeatures: ['hit-test', 'local-floor'],
            optionalFeatures: ['dom-overlay', 'anchors', 'plane-detection'], // Request plane-detection explicitly
            domOverlay: { root: elements.arOverlay }
        };

        // Note: document.body background is already dark, but AR might need it transparent.
        // However, standard Three.js procedure is to let the Session manage the view.
        state.session = await navigator.xr.requestSession('immersive-ar', sessionInit);

        console.log('Session started successfully');

        // Connect renderer to session
        await state.renderer.xr.setSession(state.session);

        state.session.addEventListener('end', onSessionEnd);

        // Setup hit test
        state.localReferenceSpace = await state.session.requestReferenceSpace('local-floor');
        state.viewerReferenceSpace = await state.session.requestReferenceSpace('viewer');

        // Setup hit test with explicit entity types to hit OBJECTS
        state.hitTestSource = await state.session.requestHitTestSource({
            space: state.viewerReferenceSpace,
            entityTypes: ['plane', 'point'] // Critical: 'point' allows hitting features that aren't planes
        });

        // Switch UI
        elements.introScreen.classList.remove('active');
        elements.arOverlay.classList.add('active');
        setMode('floor-setup');

        state.renderer.setAnimationLoop(render);
        showToast('AR Session Started');

    } catch (e) {
        console.error(e);
        showStatus('Failed to start AR: ' + e.message, true);
    }
}

function setupThreeJS() {
    state.scene = new THREE.Scene();

    // Transparent background is crucial for AR
    state.scene.background = null;

    state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    state.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.xr.enabled = true;

    // Append canvas to BODY, behind everything. 
    // IMPORTANT: It must be on BODY for proper compositing in some browsers if it's not the designated DOM overlay.
    // Since we are passing 'elements.arOverlay' as the DOM Overlay, the canvas should sit outside it.
    state.renderer.domElement.style.position = 'absolute';
    state.renderer.domElement.style.top = '0';
    state.renderer.domElement.style.left = '0';
    state.renderer.domElement.style.width = '100%';
    state.renderer.domElement.style.height = '100%';
    state.renderer.domElement.style.zIndex = '-1';

    document.body.appendChild(state.renderer.domElement);

    // Add lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    state.scene.add(light);

    // Create Reticle
    const geometry = new THREE.RingGeometry(0.04, 0.05, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    state.reticle = new THREE.Mesh(geometry, material);
    state.reticle.matrixAutoUpdate = false;
    state.reticle.visible = false;
    state.scene.add(state.reticle);
}

function setMode(mode) {
    state.mode = mode;
    elements.floorSetupPanel.classList.toggle('active', mode === 'floor-setup');
    elements.ceilingSetupPanel.classList.toggle('active', mode === 'ceiling-setup');
    elements.cornerMappingPanel.classList.toggle('active', mode === 'corner-mapping');
    elements.pinningPanel.classList.toggle('active', mode === 'pinning');
}

function setFloor(overrideY = null) {
    let y = overrideY;

    if (y === null) {
        if (!state.reticle.visible) {
            showToast('Please find a surface first!', 'error');
            return;
        }
        const position = new THREE.Vector3();
        position.setFromMatrixPosition(state.reticle.matrix);
        y = position.y;
    }

    state.floorHeight = y;
    state.autoFloorStartTime = null; // Reset auto-floor timer

    elements.debugFloor.textContent = state.floorHeight.toFixed(3) + 'm (raw)';
    elements.debugCeiling.textContent = (state.floorHeight + state.ceilingHeight).toFixed(2) + 'm';

    setMode('corner-mapping'); // Go to room outline first (before ceiling)
    visualizeFloor(state.floorHeight);
    showToast(`Floor set at ${y.toFixed(2)}m. Now outline your room!`);
}

// Ceiling measurement
let measuredCeilingY = null;

function measureCeiling() {
    if (!state.reticle.visible) return;

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(state.reticle.matrix);

    measuredCeilingY = position.y;
    const height = measuredCeilingY - state.floorHeight;

    elements.measuredCeilingHeight.textContent = height.toFixed(2);
    elements.setCeilingBtn.disabled = false;

    showToast(`Ceiling measured at ${height.toFixed(2)}m`);
}

function confirmCeiling() {
    if (measuredCeilingY === null) return;

    state.ceilingHeight = measuredCeilingY - state.floorHeight;
    elements.debugCeiling.textContent = state.ceilingHeight.toFixed(2) + 'm';

    // Re-create walls with correct height now that we know ceiling
    if (state.wallMeshes) {
        state.wallMeshes.forEach(w => state.scene.remove(w));
        state.wallMeshes = [];
    }
    createWalls();

    setMode('pinning');
    showToast(`Ceiling confirmed at ${state.ceilingHeight.toFixed(2)}m. Now pin your lights!`);
}

async function placePin() {
    if (!state.reticle.visible) return;

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(state.reticle.matrix);

    const heightFromFloor = position.y - state.floorHeight;

    // Create Visual Pin
    const pinGeom = new THREE.SphereGeometry(0.03, 16, 16); // Smaller pin
    const pinMat = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        emissive: 0x6366f1,
        emissiveIntensity: 0.6
    });
    const pinMesh = new THREE.Mesh(pinGeom, pinMat);
    pinMesh.position.copy(position);
    state.scene.add(pinMesh);

    // Text Label (Sprite)
    const pinId = state.pins.length + 1;

    // Store data
    const pin = {
        id: pinId,
        mesh: pinMesh,
        // ring: ringMesh, // Remove ring to reduce clutter
        relativePos: {
            x: position.x,
            y: position.z,  // SWAP: World Z becomes Map Y (Depth)
            z: heightFromFloor // SWAP: World Y (height) becomes Map Z
        }
    };

    state.pins.push(pin);
    updatePinCount();
    addPinToDebugList(pin);

    elements.undoPinBtn.disabled = false;
    // elements.finishBtn.disabled = false; // Always enabled now

    showToast(`Pinned #${pinId} @ ${heightFromFloor.toFixed(2)}m`);
    haptic('success');
}

// Corner Mapping Functions
function placeCorner() {
    if (!state.reticle.visible) return;

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(state.reticle.matrix);

    // Constrain to floor plane - reject if hit is too far above floor
    const heightAboveFloor = position.y - state.floorHeight;
    if (heightAboveFloor > 0.5) {
        showToast('Point at the floor to place corners', 'error');
        return;
    }

    // Place corner at floor height (snap to floor)
    const cornerPos = {
        x: position.x,
        y: state.floorHeight,
        z: position.z
    };

    // Visual marker
    const cornerGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    const cornerMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.5
    });
    const cornerMesh = new THREE.Mesh(cornerGeom, cornerMat);
    cornerMesh.position.set(cornerPos.x, cornerPos.y + 0.075, cornerPos.z);
    state.scene.add(cornerMesh);

    // If we have at least one corner, draw a line to the previous one
    if (state.corners.length > 0) {
        const prev = state.corners[state.corners.length - 1].position;
        const points = [
            new THREE.Vector3(prev.x, prev.y + 0.01, prev.z),
            new THREE.Vector3(cornerPos.x, cornerPos.y + 0.01, cornerPos.z)
        ];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
        const line = new THREE.Line(lineGeom, lineMat);
        state.scene.add(line);
        cornerMesh.userData.line = line;
    }

    state.corners.push({
        mesh: cornerMesh,
        position: cornerPos
    });

    updateCornerCount();
    elements.undoCornerBtn.disabled = false;

    showToast(`Corner ${state.corners.length} placed`);
    haptic('short');
}

function undoCorner() {
    if (state.corners.length === 0) return;

    const corner = state.corners.pop();
    state.scene.remove(corner.mesh);
    if (corner.mesh.userData.line) {
        state.scene.remove(corner.mesh.userData.line);
    }

    updateCornerCount();

    if (state.corners.length === 0) {
        elements.undoCornerBtn.disabled = true;
    }

    showToast('Removed last corner');
}

function finishCorners() {
    if (state.corners.length >= 3) {
        // Close the polygon by drawing a line from last to first
        const first = state.corners[0].position;
        const last = state.corners[state.corners.length - 1].position;
        const points = [
            new THREE.Vector3(last.x, last.y + 0.01, last.z),
            new THREE.Vector3(first.x, first.y + 0.01, first.z)
        ];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981 });
        const closingLine = new THREE.Line(lineGeom, lineMat);
        state.scene.add(closingLine);

        // Create walls
        createWalls();

        // Replace floor grid with room polygon
        createRoomFloor();
    }

    setMode('ceiling-setup'); // Now measure ceiling height
    showToast('Room outline complete! Now set the ceiling height.');
}

function createWalls() {
    if (state.corners.length < 3) return;

    // Store wall meshes for later cleanup
    state.wallMeshes = state.wallMeshes || [];

    for (let i = 0; i < state.corners.length; i++) {
        const c1 = state.corners[i].position;
        const c2 = state.corners[(i + 1) % state.corners.length].position;

        // Calculate wall dimensions
        const dx = c2.x - c1.x;
        const dz = c2.z - c1.z;
        const wallLength = Math.sqrt(dx * dx + dz * dz);
        const wallHeight = state.ceilingHeight;

        // Create wall geometry
        const wallGeom = new THREE.PlaneGeometry(wallLength, wallHeight);
        const wallMat = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const wall = new THREE.Mesh(wallGeom, wallMat);

        // Position and rotate wall
        const midX = (c1.x + c2.x) / 2;
        const midZ = (c1.z + c2.z) / 2;
        const midY = state.floorHeight + wallHeight / 2;

        wall.position.set(midX, midY, midZ);
        wall.rotation.y = -Math.atan2(dz, dx);

        state.scene.add(wall);
        state.wallMeshes.push(wall);
    }
}

function createRoomFloor() {
    // Remove old floor grid/plane
    if (state.floorGrid) state.scene.remove(state.floorGrid);
    if (state.floorPlane) state.scene.remove(state.floorPlane);

    if (state.corners.length < 3) return;

    // Create shape from corners (negate Z for correct rotation alignment)
    const shape = new THREE.Shape();
    shape.moveTo(state.corners[0].position.x, -state.corners[0].position.z);
    for (let i = 1; i < state.corners.length; i++) {
        shape.lineTo(state.corners[i].position.x, -state.corners[i].position.z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = state.floorHeight + 0.005;

    state.scene.add(floor);
    state.floorPlane = floor;
}

function updateCornerCount() {
    elements.cornerCount.textContent = state.corners.length;
}

function undoLastPin() {
    if (state.pins.length === 0) return;

    const pin = state.pins.pop();
    state.scene.remove(pin.mesh);
    // if (pin.ring) state.scene.remove(pin.ring);
    if (pin.label) state.scene.remove(pin.label);

    updatePinCount();

    // Clean up debug list
    const list = elements.debugPinsList;
    if (list.lastChild) list.removeChild(list.lastChild);

    if (state.pins.length === 0) {
        elements.undoPinBtn.disabled = true;
        // elements.finishBtn.disabled = true; // Keep enabled

        const empty = document.createElement('div');
        empty.className = 'no-pins';
        empty.textContent = 'No lights pinned';
        list.appendChild(empty);
    }

    showToast('Removed last pin');
}

function updatePinCount() {
    elements.pinCount.textContent = state.pins.length;
    elements.debugPinCount.textContent = state.pins.length;
}

function setDebugPanel(open) {
    state.isDebugOpen = open;
    elements.debugPanel.classList.toggle('active', open);
}

function render(timestamp, frame) {
    if (!frame) return;

    const hitTestResults = frame.getHitTestResults(state.hitTestSource);
    if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(state.localReferenceSpace);

        const wasVisible = state.reticle.visible;
        state.reticle.visible = true;
        state.reticle.matrix.fromArray(pose.transform.matrix);
        state.isTargeting = true;
        document.getElementById('reticle').classList.add('targeting');

        // Plane detection VFX: trigger when first detected
        if (!wasVisible) {
            haptic('double');
            createPlaneDetectedVFX(pose.transform.position);
        }

        // Update height indicator
        const currentY = pose.transform.position.y;
        if (state.floorHeight !== null) {
            const h = (currentY - state.floorHeight);
            elements.heightVal.textContent = h.toFixed(2);
            document.getElementById('debug-cam-height').textContent = h.toFixed(2) + 'm';
        }

        // Auto-floor detection: If in floor-setup mode and hitting a roughly horizontal surface
        if (state.mode === 'floor-setup') {
            // Check if the hit is roughly horizontal by examining the pose orientation
            // For simplicity, we assume any stable hit for 1 second triggers auto-floor
            if (state.autoFloorStartTime === null) {
                state.autoFloorStartTime = timestamp;
                document.getElementById('floor-detection-status').textContent = 'Floor detected! Hold steady...';
            } else {
                const elapsed = timestamp - state.autoFloorStartTime;
                const progress = Math.min(1, elapsed / state.autoFloorThreshold);
                document.getElementById('floor-detection-status').textContent =
                    `Floor detected! ${Math.round(progress * 100)}%`;

                if (elapsed >= state.autoFloorThreshold) {
                    // Auto-set floor
                    setFloor(currentY);
                }
            }
        }
    } else {
        state.reticle.visible = false;
        state.isTargeting = false;
        state.autoFloorStartTime = null; // Reset auto-floor timer
        document.getElementById('reticle').classList.remove('targeting');

        if (state.mode === 'floor-setup') {
            document.getElementById('floor-detection-status').textContent = 'Searching for floor...';
        }
    }

    state.renderer.render(state.scene, state.camera);
}

// Add a floor helper when floor IS set
function visualizeFloor(height) {
    if (state.floorGrid) state.scene.remove(state.floorGrid);

    // Create a large grid at floor height
    state.floorGrid = new THREE.GridHelper(20, 20, 0x10b981, 0x10b981);
    state.floorGrid.position.y = height;
    state.scene.add(state.floorGrid);

    // Transparent plane to show "ground"
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = height;

    if (state.floorPlane) state.scene.remove(state.floorPlane);
    state.floorPlane = plane;
    state.scene.add(state.floorPlane);
}

function onSessionEnd() {
    state.renderer.setAnimationLoop(null); // Stop AR loop
    state.session = null;
    document.body.style.backgroundColor = ''; // Restore background
    elements.arOverlay.classList.remove('active');
    // If we have pins, show results, else back to intro
    if (state.pins.length > 0) {
        showResults();
    } else {
        elements.introScreen.classList.add('active');
    }
}

function endAR() {
    if (state.session) {
        state.session.end();
    }
}

function showResults() {
    if (state.session) {
        state.session.end();
    }

    elements.arOverlay.classList.remove('active');
    elements.resultsScreen.classList.add('active');

    document.getElementById('results-pin-count').textContent = state.pins.length;

    // Calculate bounds
    if (state.pins.length > 0) {
        const xs = state.pins.map(p => p.relativePos.x);
        const zs = state.pins.map(p => p.relativePos.z);
        const width = Math.max(...xs) - Math.min(...xs);
        const depth = Math.max(...zs) - Math.min(...zs);

        document.getElementById('room-width').textContent = width.toFixed(2);
        document.getElementById('room-depth').textContent = depth.toFixed(2);
        document.getElementById('room-height').textContent = state.ceilingHeight.toFixed(2);

        // Populate lights list
        const list = document.getElementById('results-lights-list');
        list.innerHTML = '';
        state.pins.forEach(p => {
            const item = document.createElement('div');
            item.className = 'light-item';
            item.innerHTML = `
                <span class="light-name">Light ${p.id}</span>
                <span class="light-coords">x:${p.relativePos.x.toFixed(2)} y:${p.relativePos.y.toFixed(2)} z:${p.relativePos.z.toFixed(2)}</span>
            `;
            list.appendChild(item);
        });

        // Generate JSON
        const output = {
            room_bounds: {
                floor_y: state.floorHeight,
                ceiling_height: state.ceilingHeight,
                width: width,
                depth: depth
            },
            lights: state.pins.reduce((acc, p) => {
                acc[`light.mapped_${p.id}`] = {
                    x: p.relativePos.x,
                    y: p.relativePos.y, // This is now Depth (World Z)
                    z: p.relativePos.z  // This is now Height (World Y)
                };
                return acc;
            }, {})
        };

        elements.jsonOutput.textContent = JSON.stringify(output, null, 2);

        // Initialize 3D Visualizer
        setupVisualizer();
    }
}

// Utilities
function copyToClipboard() {
    const text = elements.jsonOutput.textContent;
    navigator.clipboard.writeText(text).then(() => {
        showToast('JSON copied to clipboard!', 'success');
    });
}

function downloadJSON() {
    const text = elements.jsonOutput.textContent;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lights_map_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Debug export: capture all state data for diagnosis
function debugExport() {
    const debugData = {
        timestamp: new Date().toISOString(),
        floorHeight: state.floorHeight,
        ceilingHeight: state.ceilingHeight,
        corners: state.corners.map(c => ({
            x: c.position.x,
            y: c.position.y,
            z: c.position.z
        })),
        pins: state.pins.map(p => ({
            id: p.id,
            relativePos: p.relativePos
        }))
    };

    const jsonStr = JSON.stringify(debugData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
        showToast('Debug data copied to clipboard!');
    }).catch(err => {
        console.error('Clipboard error:', err);
        // Fallback: log to console
        console.log('DEBUG DATA:', jsonStr);
        showToast('Debug data logged to console');
    });

    return debugData;
}

// Expose debug function globally
window.debugExport = debugExport;

function addPinToDebugList(pin) {
    const item = document.createElement('div');
    item.className = 'debug-pin-item';
    // Display as user expects: X, Depth(Y), Height(Z)
    item.innerHTML = `
        <span class="pin-name">Light ${pin.id}</span>
        <span class="pin-coords">x:${pin.relativePos.x.toFixed(2)} d:${pin.relativePos.y.toFixed(2)} h:${pin.relativePos.z.toFixed(2)}</span>
    `;
    elements.debugPinsList.appendChild(item);

    // Remove "no pins" msg
    const noPins = elements.debugPinsList.querySelector('.no-pins');
    if (noPins) noPins.remove();
}

function refreshDebugPinsList() {
    elements.debugPinsList.innerHTML = '';
    if (state.pins.length === 0) {
        elements.debugPinsList.innerHTML = '<p class="no-pins">No pins yet</p>';
    } else {
        state.pins.forEach(p => addPinToDebugList(p));
    }
}

/**
 * 3D Room Visualizer
 * Reconstructs the mapped space for review
 */
function setupVisualizer() {
    const mount = elements.visualizerMount;
    if (!mount) return;

    // Clear previous if any
    mount.innerHTML = '';

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    scene.add(directional);

    // Orbit Pivot
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Helper: Floor
    const floorGeom = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    pivot.add(floor);

    const grid = new THREE.GridHelper(10, 10, 0x475569, 0x334155);
    pivot.add(grid);

    // No ceiling plane in visualizer (user request)

    // Center point of pins to center the view
    let centerX = 0, centerZ = 0;
    if (state.pins.length > 0) {
        centerX = state.pins.reduce((sum, p) => sum + p.relativePos.x, 0) / state.pins.length;
        centerZ = state.pins.reduce((sum, p) => sum + p.relativePos.y, 0) / state.pins.length;
    } else if (state.corners.length > 0) {
        centerX = state.corners.reduce((sum, c) => sum + c.position.x, 0) / state.corners.length;
        centerZ = state.corners.reduce((sum, c) => sum + c.position.z, 0) / state.corners.length;
    }
    pivot.position.set(-centerX, 0, -centerZ);

    // Grid alignment: find best rotation to align with room edges
    if (state.corners.length >= 3) {
        // Calculate all edge angles
        const edgeAngles = [];
        for (let i = 0; i < state.corners.length; i++) {
            const c1 = state.corners[i].position;
            const c2 = state.corners[(i + 1) % state.corners.length].position;
            const dx = c2.x - c1.x;
            const dz = c2.z - c1.z;
            const angle = Math.atan2(dz, dx);
            const length = Math.sqrt(dx * dx + dz * dz);
            edgeAngles.push({ angle, length });
        }

        // Normalize angles to 0-90 degree range (edges can be any of 4 perpendicular orientations)
        const normalizedAngles = edgeAngles.map(e => {
            let a = e.angle;
            while (a < 0) a += Math.PI;
            while (a >= Math.PI / 2) a -= Math.PI / 2;
            return { angle: a, length: e.length };
        });

        // Find weighted average by edge length (prefer longer edges)
        const totalLength = normalizedAngles.reduce((sum, e) => sum + e.length, 0);
        const weightedAngle = normalizedAngles.reduce((sum, e) => sum + e.angle * e.length, 0) / totalLength;

        // Apply rotation to grid
        grid.rotation.y = weightedAngle;
    }

    // Room Polygon and Walls from corners
    if (state.corners.length >= 3) {
        // Floor polygon outline
        const cornerPoints = state.corners.map(c =>
            new THREE.Vector3(c.position.x, 0.02, c.position.z)
        );
        cornerPoints.push(cornerPoints[0].clone());

        const polygonGeom = new THREE.BufferGeometry().setFromPoints(cornerPoints);
        const polygonMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
        const polygonLine = new THREE.Line(polygonGeom, polygonMat);
        pivot.add(polygonLine);

        // Floor fill (negate Z for correct rotation alignment)
        const floorShape = new THREE.Shape();
        floorShape.moveTo(state.corners[0].position.x, -state.corners[0].position.z);
        for (let i = 1; i < state.corners.length; i++) {
            floorShape.lineTo(state.corners[i].position.x, -state.corners[i].position.z);
        }
        floorShape.closePath();

        const floorFillGeom = new THREE.ShapeGeometry(floorShape);
        const floorFillMat = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const floorFill = new THREE.Mesh(floorFillGeom, floorFillMat);
        floorFill.rotation.x = -Math.PI / 2;
        floorFill.position.y = 0.01;
        pivot.add(floorFill);

        // Walls with back-face transparency
        for (let i = 0; i < state.corners.length; i++) {
            const c1 = state.corners[i].position;
            const c2 = state.corners[(i + 1) % state.corners.length].position;

            const dx = c2.x - c1.x;
            const dz = c2.z - c1.z;
            const wallLength = Math.sqrt(dx * dx + dz * dz);
            const wallHeight = state.ceilingHeight;

            const wallGeom = new THREE.PlaneGeometry(wallLength, wallHeight);
            const wallMat = new THREE.MeshBasicMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: 0.12,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.NormalBlending
            });
            const wall = new THREE.Mesh(wallGeom, wallMat);

            const midX = (c1.x + c2.x) / 2;
            const midZ = (c1.z + c2.z) / 2;
            const midY = wallHeight / 2;

            wall.position.set(midX, midY, midZ);
            wall.rotation.y = -Math.atan2(dz, dx);

            pivot.add(wall);
        }

        // Corner markers
        state.corners.forEach((c, i) => {
            const markerGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
            const markerMat = new THREE.MeshStandardMaterial({
                color: 0x10b981,
                emissive: 0x10b981,
                emissiveIntensity: 0.3
            });
            const marker = new THREE.Mesh(markerGeom, markerMat);
            marker.position.set(c.position.x, 0.05, c.position.z);
            pivot.add(marker);
        });
    }

    // Add Axes Helper
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.set(0, 0.01, 0);
    pivot.add(axesHelper);

    // Axes labels
    const axisLabels = [
        { text: 'X', pos: [1.1, 0.01, 0], color: '#ff0000' },
        { text: 'Y', pos: [0, 0.01, 1.1], color: '#00ff00' }
    ];
    axisLabels.forEach(({ text, pos, color }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(pos[0], pos[1], pos[2]);
        sprite.scale.set(0.15, 0.15, 1);
        pivot.add(sprite);
    });

    // Add Pins with coordinate labels
    state.pins.forEach(p => {
        // Pin Sphere
        const pinGeom = new THREE.SphereGeometry(0.04, 16, 16);
        const pinMat = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            emissive: 0x6366f1,
            emissiveIntensity: 0.5
        });
        const pin = new THREE.Mesh(pinGeom, pinMat);
        // Correct mapping: x, y (depth/worldZ), z (height/worldY) 
        // In this preview, world Y is Up.
        pin.position.set(p.relativePos.x, p.relativePos.z, p.relativePos.y);
        pivot.add(pin);

        // Vertical Line from floor
        const points = [];
        points.push(new THREE.Vector3(p.relativePos.x, 0, p.relativePos.y));
        points.push(new THREE.Vector3(p.relativePos.x, p.relativePos.z, p.relativePos.y));
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.5 });
        const line = new THREE.Line(lineGeom, lineMat);
        pivot.add(line);

        // Coordinate label (larger text)
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512;
        labelCanvas.height = 128;
        const labelCtx = labelCanvas.getContext('2d');
        labelCtx.fillStyle = 'rgba(0,0,0,0.7)';
        labelCtx.fillRect(0, 0, 512, 128);
        labelCtx.fillStyle = 'white';
        labelCtx.font = 'bold 48px monospace';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        const coordText = `${p.relativePos.x.toFixed(2)}, ${p.relativePos.y.toFixed(2)}, ${p.relativePos.z.toFixed(2)}`;
        labelCtx.fillText(coordText, 256, 64);

        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, depthTest: false });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.position.set(p.relativePos.x, p.relativePos.z + 0.15, p.relativePos.y);
        labelSprite.scale.set(0.5, 0.125, 1);
        pivot.add(labelSprite);
    });

    // Interaction logic
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotationY = Math.PI / 4;
    let rotationX = 0.5;
    let distance = 8;

    function updateCamera() {
        const x = distance * Math.sin(rotationY) * Math.cos(rotationX);
        const y = distance * Math.sin(rotationX);
        const z = distance * Math.cos(rotationY) * Math.cos(rotationX);

        camera.position.set(x, y, z);
        camera.lookAt(0, 0.5, 0);
    }

    function onMove(x, y) {
        if (!isDragging) return;
        const dx = x - prevX;
        const dy = y - prevY;

        rotationY -= dx * 0.01;
        rotationX = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, rotationX + dy * 0.01));

        updateCamera();
        prevX = x;
        prevY = y;
    }

    mount.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => isDragging = false);

    mount.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            state.pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
            isDragging = false;
        } else {
            isDragging = true;
            prevX = e.touches[0].clientX;
            prevY = e.touches[0].clientY;
        }
    }, { passive: false });
    mount.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && state.pinchStartDistance) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const delta = (state.pinchStartDistance - currentDistance) * 0.02;
            distance = Math.max(2, Math.min(20, distance + delta));
            state.pinchStartDistance = currentDistance;
            updateCamera();
        } else if (e.touches.length === 1) {
            onMove(e.touches[0].clientX, e.touches[0].clientY);
        }
        e.preventDefault();
    }, { passive: false });
    mount.addEventListener('touchend', e => {
        isDragging = false;
        state.pinchStartDistance = null;
    });

    // Mouse wheel zoom
    mount.addEventListener('wheel', e => {
        distance = Math.max(2, Math.min(20, distance + e.deltaY * 0.01));
        updateCamera();
        e.preventDefault();
    }, { passive: false });

    // Initial positioning
    updateCamera();

    function animate() {
        if (elements.resultsScreen.classList.contains('active')) {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
    }
    animate();
}

// Start the app
init();
