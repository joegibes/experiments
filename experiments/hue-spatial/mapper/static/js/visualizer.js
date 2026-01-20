import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';

export class Visualizer {
    constructor() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x202020);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 5, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Lights
        const ambient = new THREE.AmbientLight(0x404040);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);

        // Grid
        const grid = new THREE.GridHelper(10, 10);
        this.scene.add(grid);

        this.loadMap();
        this.animate();

        // UI
        const btn = document.createElement('button');
        btn.innerText = "Back to Mapper";
        btn.style.position = "absolute";
        btn.style.top = "20px";
        btn.style.left = "20px";
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

        // Draw Floor
        const shape = new THREE.Shape();
        data.room.floor_points.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, -p.z); // Three.js Shape is 2D (x, y), map to x, z
            else shape.lineTo(p.x, -p.z);
        });

        const floorGeo = new THREE.ShapeGeometry(shape);
        floorGeo.rotateX(Math.PI / 2); // Rotate to horizontal
        // Floor points usually have y=height. We should align geometry y to the average y of floor points
        const avgY = data.room.floor_points[0].y;
        floorGeo.translate(0, avgY, 0); // Move to actual height

        const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ color: 0x555555, side: THREE.DoubleSide }));
        this.scene.add(floorMesh);

        // Draw Ceiling (Wireframe)
        const ceilingGeo = floorGeo.clone();
        ceilingGeo.translate(0, data.room.ceiling_height, 0);
        const ceilingMesh = new THREE.Mesh(ceilingGeo, new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true }));
        this.scene.add(ceilingMesh);

        // Draw Lights
        data.lights.forEach(light => {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x888800 })
            );
            sphere.position.set(light.position.x, light.position.y, light.position.z);
            this.scene.add(sphere);

            // Add Label (simple approach: stick)
            const stick = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 0.5),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            stick.position.copy(sphere.position);
            stick.position.y -= 0.25;
            this.scene.add(stick);
        });

        console.log("Scene rendered", data);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}
