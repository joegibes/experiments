import * as THREE from 'three';
import { ARButton } from 'three/addons/ARButton.js';
import { Logger } from './logger.js';

export class Mapper {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        this.scene = new THREE.Scene();

        // AR Camera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Light
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        this.scene.add(light);

        // Controller
        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('select', () => this.onSelect());
        this.scene.add(this.controller);

        // Reticle
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
        this.mode = 'IDLE';

        // Data
        this.floorPoints = [];
        this.lights = [];
        this.ceilingHeight = 2.4;

        // Visuals
        this.floorLine = null;
        this.roomMesh = null;

        this.ui = {
            status: document.getElementById('status-text'),
            btn: document.getElementById('action-btn')
        };

        if(this.ui.btn) {
             this.ui.btn.onclick = () => this.nextState();
        }

        this.setupAR();
    }

    setupAR() {
        const button = ARButton.createButton(this.renderer, { requiredFeatures: ['hit-test'] });
        document.body.appendChild(button);
        this.renderer.setAnimationLoop((timestamp, frame) => this.render(timestamp, frame));
    }

    nextState() {
        if (this.mode === 'IDLE') {
            this.mode = 'FLOOR_CORNERS';
            this.ui.status.innerText = 'Tap corners to define floor.';
            this.ui.btn.innerText = 'Finish Floor';
        } else if (this.mode === 'FLOOR_CORNERS') {
            if (this.floorPoints.length < 3) {
                this.ui.status.innerText = 'Need 3+ points!';
                return;
            }
            this.buildRoomVisuals();
            this.mode = 'LIGHTS';
            this.ui.status.innerText = 'Tap lights to place them.';
            this.ui.btn.innerText = 'Save Map';
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

        // Marker
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        marker.position.copy(position);
        this.scene.add(marker);

        this.updateFloorVisuals();
    }

    updateFloorVisuals() {
        if (this.floorPoints.length < 2) return;

        if (this.floorLine) this.scene.remove(this.floorLine);

        const points = [...this.floorPoints, this.floorPoints[0]];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
        this.floorLine = new THREE.Line(geometry, material);
        this.scene.add(this.floorLine);
    }

    buildRoomVisuals() {
        if (this.roomMesh) this.scene.remove(this.roomMesh);

        // Build Extruded Room Mesh for AR
        const shape = new THREE.Shape();
        // Project 3D points to 2D shape (XZ plane)
        // We assume floor is roughly flat at the height of the first point
        const yBase = this.floorPoints[0].y;

        this.floorPoints.forEach((p, i) => {
             // Relative to first point
             if (i===0) shape.moveTo(p.x, -p.z);
             else shape.lineTo(p.x, -p.z);
        });

        const geometry = new THREE.ExtrudeGeometry(shape, {
            steps: 1,
            depth: this.ceilingHeight,
            bevelEnabled: false
        });
        geometry.rotateX(Math.PI / 2); // Z -> Y

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            wireframe: false,
            side: THREE.DoubleSide
        });

        this.roomMesh = new THREE.Mesh(geometry, material);
        this.roomMesh.position.y = yBase;
        this.scene.add(this.roomMesh);

        // Add wireframe on top
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00ffff }));
        this.roomMesh.add(line);
    }

    addLight(position) {
        const id = `light_${this.lights.length + 1}`;
        this.lights.push({ id, position: position.clone() });

        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        mesh.position.copy(position);
        this.scene.add(mesh);

        // Feedback
        this.ui.status.innerText = `Placed Light ${this.lights.length}`;
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

        this.ui.status.innerText = "Saving...";

        try {
            const res = await fetch('/api/save-map', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (json.status === 'success') {
                this.ui.status.innerText = "Saved! Loading Visualizer...";
                setTimeout(() => {
                   window.location.href = '/?mode=visualizer';
                }, 1000);
            } else {
                this.ui.status.innerText = "Error Saving.";
            }
        } catch (e) {
            console.error(e);
            this.ui.status.innerText = "Network Error.";
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
                    document.getElementById('overlay-ui').style.display = 'none';
                    document.getElementById('menu').style.display = 'flex';
                    this.mode = 'IDLE';
                });
                this.hitTestSourceRequested = true;
                this.nextState();
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
