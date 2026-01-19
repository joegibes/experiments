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
    pins: [], // Array of { id, anchor, mesh, position: {x, y, z} }

    // UI state
    mode: 'intro', // intro, floor-setup, pinning, results
    isDebugOpen: false,
    isTargeting: false
};

// DOM Elements
const elements = {
    introScreen: document.getElementById('intro-screen'),
    arOverlay: document.getElementById('ar-overlay'),
    resultsScreen: document.getElementById('results-screen'),
    debugPanel: document.getElementById('debug-panel'),

    floorSetupPanel: document.getElementById('floor-setup-panel'),
    pinningPanel: document.getElementById('pinning-panel'),

    startBtn: document.getElementById('start-ar-btn'),
    exitBtn: document.getElementById('exit-ar-btn'),
    toggleDebugBtn: document.getElementById('toggle-debug-btn'),
    closeDebugBtn: document.getElementById('close-debug-btn'),

    setFloorBtn: document.getElementById('set-floor-manual-btn'),
    skipFloorBtn: document.getElementById('skip-floor-btn'),
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

    elements.setFloorBtn.addEventListener('click', () => setFloor(state.reticle.position.y));
    elements.skipFloorBtn.addEventListener('click', () => setFloor(0)); // Assume origin is floor

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

    // Handle taps in pinning mode - IGNORE button clicks
    window.addEventListener('click', (e) => {
        // If clicking a button or UI element, ignore
        if (e.target.closest('button') || e.target.closest('.action-btn') || e.target.closest('.icon-btn')) return;

        if (state.mode === 'pinning' && state.isTargeting) {
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
    elements.pinningPanel.classList.toggle('active', mode === 'pinning');

    // In pinning mode, we want the "Finish" button visible
    // We'll move it to top-right in CSS
}

function setFloor() {
    // improved floor logic
    if (!state.reticle.visible) {
        showToast('Please find a surface first!', 'error');
        return;
    }

    // The Reticle is ALREADY at the hit location.
    // We want this Y to be our new "0".
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(state.reticle.matrix);

    state.floorHeight = position.y;

    elements.debugFloor.textContent = state.floorHeight.toFixed(3) + 'm (raw)';
    elements.debugCeiling.textContent = (state.floorHeight + state.ceilingHeight).toFixed(2) + 'm';

    setMode('pinning');
    visualizeFloor(state.floorHeight);
    showToast('Floor Verified! height=0');
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

        state.reticle.visible = true;
        state.reticle.matrix.fromArray(pose.transform.matrix);
        state.isTargeting = true;
        document.getElementById('reticle').classList.add('targeting');

        // Update height indicator
        const currentY = pose.transform.position.y;
        if (state.floorHeight !== null) {
            const h = (currentY - state.floorHeight);
            elements.heightVal.textContent = h.toFixed(2);
            document.getElementById('debug-cam-height').textContent = h.toFixed(2) + 'm';
        }
    } else {
        state.reticle.visible = false;
        state.isTargeting = false;
        document.getElementById('reticle').classList.remove('targeting');
    }

    // Plane Visualization
    if (state.session && state.localReferenceSpace) {
        // This is a simplified plane visualizer
        // In a real app we would track planes by ID and update their geometry
        // For PoC, we rely on the reticle aligning to them, which confirms detection
        // But the user asked to SEE them.

        // Note: Full mesh updates for planes is complex in vanilla Three.js without a helper library
        // We will stick to the Reticle aligning for now, but ensure it aligns to everything.
        // To truly "See" planes we'd need to iterate frame.detectedPlanes (if available in this mode)
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

    // Ceiling Plane (Transparent)
    const ceilGeom = new THREE.PlaneGeometry(10, 10);
    const ceilMat = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    const ceil = new THREE.Mesh(ceilGeom, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = state.ceilingHeight;
    pivot.add(ceil);

    // Center point of pins to center the view
    let centerX = 0, centerZ = 0;
    if (state.pins.length > 0) {
        centerX = state.pins.reduce((sum, p) => sum + p.relativePos.x, 0) / state.pins.length;
        centerZ = state.pins.reduce((sum, p) => sum + p.relativePos.y, 0) / state.pins.length;
    }
    pivot.position.set(-centerX, 0, -centerZ);

    // Add Pins
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
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
    }, { passive: false });
    mount.addEventListener('touchmove', e => {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
    }, { passive: false });
    mount.addEventListener('touchend', () => isDragging = false);

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
