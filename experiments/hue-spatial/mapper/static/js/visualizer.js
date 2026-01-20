import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Visualizer {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        // Cyberpunk/Dark Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);
        this.scene.fog = new THREE.FogExp2(0x121212, 0.1);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 1, 0);

        // Lights
        const ambient = new THREE.AmbientLight(0x404040);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Grid
        const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(grid);

        this.loadMap();
        this.animate();

        // Back Button
        this.addBackButton();
    }

    addBackButton() {
        const btn = document.createElement('button');
        btn.innerText = "← BACK";
        btn.style.position = "absolute";
        btn.style.top = "20px";
        btn.style.left = "20px";
        btn.style.background = "rgba(0,0,0,0.5)";
        btn.style.color = "white";
        btn.style.border = "1px solid #555";
        btn.style.padding = "10px 20px";
        btn.style.cursor = "pointer";
        btn.onclick = () => window.location.href = "/";
        document.body.appendChild(btn);
    }

    async loadMap() {
        try {
            const res = await fetch('/api/map');
            const data = await res.json();
            this.renderData(data);
        } catch (e) {
            console.error("Failed to load map", e);
        }
    }

    renderData(data) {
        if (!data.room || !data.room.floor_points) return;

        // 1. Create Floor Shape
        const shape = new THREE.Shape();
        data.room.floor_points.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, -p.z);
            else shape.lineTo(p.x, -p.z);
        });

        // 2. Extrude Room (Walls)
        const extrudeSettings = {
            steps: 1,
            depth: data.room.ceiling_height, // This extrudes in Z (which we'll rotate to Y)
            bevelEnabled: false
        };

        const roomGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        roomGeo.rotateX(-Math.PI / 2); // Rotate so depth becomes height (Y)

        // Material: Semi-transparent walls
        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x8888ff,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const roomMesh = new THREE.Mesh(roomGeo, wallMat);
        // Align floor
        if (data.room.floor_points.length > 0) {
             roomMesh.position.y = data.room.floor_points[0].y;
        }
        this.scene.add(roomMesh);

        // 3. Wireframe outline for walls
        const edges = new THREE.EdgesGeometry(roomGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x8888ff, opacity: 0.3, transparent: true }));
        line.position.copy(roomMesh.position);
        this.scene.add(line);


        // 4. Lights
        data.lights.forEach(light => {
            const group = new THREE.Group();
            group.position.set(light.position.x, light.position.y, light.position.z);

            // Bulb
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 32, 32),
                new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 2 })
            );
            group.add(sphere);

            // Light Source (Actual Light)
            const pointLight = new THREE.PointLight(0xffaa00, 1, 5);
            group.add(pointLight);

            // Glow Sprite
            // (Optional, skip for now to keep simple)

            this.scene.add(group);
        });

        console.log("Scene rendered", data);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
