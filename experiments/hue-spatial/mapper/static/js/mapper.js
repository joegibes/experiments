import * as THREE from '../vendor/three.module.js';
import { ARButton } from '../vendor/ARButton.js';
import { Logger } from './logger.js';

export class Mapper {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Light for the virtual scene
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        this.scene.add(light);

        // Controller / Reticle
        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('select', () => this.onSelect());
        this.scene.add(this.controller);

        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial()
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);

        // State
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.mode = 'IDLE'; // IDLE, FLOOR_CORNERS, LIGHTS

        // Data
        this.floorPoints = [];
        this.lights = [];
        this.ceilingHeight = 2.4; // Default

        // Visuals
        this.floorLine = null;
        this.wallMesh = null;
        this.lightMeshes = [];

        this.initUI();
        this.setupAR();
    }

    setupAR() {
        const button = ARButton.createButton(this.renderer, { requiredFeatures: ['hit-test'] });
        document.body.appendChild(button);
        this.renderer.setAnimationLoop((timestamp, frame) => this.render(timestamp, frame));
    }

    initUI() {
        this.ui = document.createElement('div');
        this.ui.style.position = 'absolute';
        this.ui.style.bottom = '20px';
        this.ui.style.left = '0';
        this.ui.style.width = '100%';
        this.ui.style.textAlign = 'center';
        this.ui.style.zIndex = '100';
        this.ui.style.color = 'white';
        this.ui.style.fontFamily = 'sans-serif';
        this.ui.style.textShadow = '1px 1px 2px black';

        this.statusText = document.createElement('div');
        this.statusText.innerText = 'Start AR to begin';
        this.ui.appendChild(this.statusText);

        this.actionBtn = document.createElement('button');
        this.actionBtn.innerText = 'Next: Define Floor';
        this.actionBtn.style.fontSize = '1.2em';
        this.actionBtn.style.padding = '10px 20px';
        this.actionBtn.style.marginTop = '10px';
        this.actionBtn.onclick = () => this.nextState();
        this.actionBtn.style.display = 'none'; // Hidden until AR starts
        this.ui.appendChild(this.actionBtn);

        document.body.appendChild(this.ui);
    }

    nextState() {
        if (this.mode === 'IDLE') {
            this.mode = 'FLOOR_CORNERS';
            this.statusText.innerText = 'Tap on floor to mark corners. (Clockwise/Counter-Clockwise)';
            this.actionBtn.innerText = 'Finish Floor';
        } else if (this.mode === 'FLOOR_CORNERS') {
            if (this.floorPoints.length < 3) {
                alert("Need at least 3 points for floor.");
                return;
            }
            this.buildRoomVisuals();
            this.mode = 'LIGHTS';
            this.statusText.innerText = 'Tap to place lights on walls/ceiling/lamps.';
            this.actionBtn.innerText = 'Save Map';
        } else if (this.mode === 'LIGHTS') {
            this.saveMap();
        }
    }

    onSelect() {
        if (this.reticle.visible) {
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(this.reticle.matrix);

            Logger.info('User Tap', { mode: this.mode, position: position });

            if (this.mode === 'FLOOR_CORNERS') {
                this.addFloorPoint(position);
            } else if (this.mode === 'LIGHTS') {
                this.addLight(position);
            }
        }
    }

    addFloorPoint(position) {
        this.floorPoints.push(position.clone());

        // Visual marker
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        marker.position.copy(position);
        this.scene.add(marker);

        this.updateFloorVisuals();
    }

    updateFloorVisuals() {
        if (this.floorPoints.length < 2) return;

        if (this.floorLine) this.scene.remove(this.floorLine);

        const points = [...this.floorPoints, this.floorPoints[0]]; // Close loop
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
        this.floorLine = new THREE.Line(geometry, material);
        this.scene.add(this.floorLine);
    }

    buildRoomVisuals() {
        // Simple extrusion visualization
        // In a real app we'd triangulate the floor polygon
        // Here we just draw pillars at corners to ceiling height

        const ceilingY = this.floorPoints[0].y + this.ceilingHeight;

        // Draw Walls (Wireframe)
        for (let i = 0; i < this.floorPoints.length; i++) {
            const p1 = this.floorPoints[i];
            const p2 = this.floorPoints[(i + 1) % this.floorPoints.length];

            const wallGeo = new THREE.BufferGeometry().setFromPoints([
                p1, new THREE.Vector3(p1.x, ceilingY, p1.z),
                new THREE.Vector3(p2.x, ceilingY, p2.z),
                p2, p1
            ]);
            const wall = new THREE.Line(wallGeo, new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 }));
            this.scene.add(wall);
        }
    }

    addLight(position) {
        const id = `light_${this.lights.length + 1}`;
        this.lights.push({ id, position: position.clone() });

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        mesh.position.copy(position);
        this.scene.add(mesh);

        Logger.info('Light Added', { id, position });
    }

    async saveMap() {
        const data = {
            room: {
                floor_points: this.floorPoints,
                ceiling_height: this.ceilingHeight,
                walls: []
            },
            lights: this.lights,
            timestamp: Date.now() / 1000
        };

        Logger.info('Saving Map', data);
        this.statusText.innerText = "Saving...";

        try {
            const res = await fetch('/api/save-map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (json.status === 'success') {
                this.statusText.innerText = "Map Saved! Check Visualizer.";
                setTimeout(() => {
                   window.location.href = '/?mode=visualizer';
                }, 2000);
            } else {
                this.statusText.innerText = "Error Saving.";
            }
        } catch (e) {
            console.error(e);
            this.statusText.innerText = "Network Error.";
        }
    }

    render(timestamp, frame) {
        if (frame) {
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const session = this.renderer.xr.getSession();

            // Hit Test
            if (this.hitTestSourceRequested === false) {
                session.requestReferenceSpace('viewer').then((referenceSpace) => {
                    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                        this.hitTestSource = source;
                    });
                });
                session.addEventListener('end', () => {
                    this.hitTestSourceRequested = false;
                    this.hitTestSource = null;
                    this.actionBtn.style.display = 'none';
                    this.mode = 'IDLE';
                });
                this.hitTestSourceRequested = true;

                // Show UI once AR starts
                this.actionBtn.style.display = 'inline-block';
                if(this.mode === 'IDLE') this.nextState();
            }

            if (this.hitTestSource) {
                const hitTestResults = frame.getHitTestResults(this.hitTestSource);
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    this.reticle.visible = true;
                    this.reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
                } else {
                    this.reticle.visible = false;
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}
