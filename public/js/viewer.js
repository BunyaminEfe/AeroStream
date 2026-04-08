import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

class AeroViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        
        // State
        this.model = null;
        this.modelSize = new THREE.Vector3(5, 2, 8); // Default
        this.flowLines = null;
        this.windSpeed = 50;
        this.windDir = 0;
        this.turbulence = 30;
        this.cinematic = true; 
        this.trailLength = 40;
        this.vizMode = 'streamlines';
        this.time = 0; // For noise/chaos
        
        this.initScene();
        this.initEventListeners();
        this.animate();
    }

    initScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0b0e);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Post Processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
            1.5, // Strength
            0.4, // Radius
            0.85 // Threshold
        );
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0x00f2ff, 150);
        spotLight.position.set(10, 20, 10);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 1;
        this.scene.add(spotLight);

        const pointLight = new THREE.PointLight(0xffffff, 80);
        pointLight.position.set(-15, 10, -5);
        this.scene.add(pointLight);

        // Reflective Floor
        this.groundMirror = new Reflector(new THREE.PlaneGeometry(100, 100), {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x111111
        });
        this.groundMirror.rotateX(-Math.PI / 2);
        this.groundMirror.position.y = -0.01;
        this.scene.add(this.groundMirror);

        // Env Map (Procedural)
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Grid (Subtle)
        const grid = new THREE.GridHelper(40, 40, 0x111111, 0x111111);
        this.scene.add(grid);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initEventListeners() {
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        this.dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) this.handleFileUpload(file);
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFileUpload(file);
        });

        // UI Controls
        document.getElementById('wind-speed').addEventListener('input', (e) => {
            this.windSpeed = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${this.windSpeed} m/s`;
        });

        document.getElementById('wind-dir').addEventListener('input', (e) => {
            this.windDir = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${this.windDir}°`;
        });

        document.getElementById('cinematic-mode').addEventListener('change', (e) => {
            this.cinematic = e.target.checked;
            this.updateCinematicSetting();
        });

        document.getElementById('trail-length').addEventListener('input', (e) => {
            this.trailLength = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${this.trailLength} points`;
            this.initParticleSystem();
        });

        document.getElementById('turbulence').addEventListener('input', (e) => {
            this.turbulence = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = `${this.turbulence}%`;
        });

        document.getElementById('viz-mode').addEventListener('change', (e) => {
            this.vizMode = e.target.value;
            this.updateVisualization();
        });

        document.getElementById('reset-sim').addEventListener('click', () => {
            if (this.model) {
                this.controls.reset();
                this.initParticleSystem();
            }
        });
    }

    async handleFileUpload(file) {
        const formData = new FormData();
        formData.append('model', file);

        document.getElementById('loading-overlay').classList.remove('hidden');
        this.dropZone.classList.add('hidden');

        try {
            const response = await fetch('upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status === 'success') {
                this.loadModel(result.path);
            } else {
                alert(result.message);
                document.getElementById('loading-overlay').classList.add('hidden');
                this.dropZone.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Upload error:', error);
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }

    loadModel(url) {
        const loader = new GLTFLoader();
        if (this.model) this.scene.remove(this.model);

        loader.load(url, (gltf) => {
            this.model = gltf.scene;
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 6 / maxDim;
            this.model.scale.setScalar(scale);
            this.model.position.sub(center.multiplyScalar(scale));
            this.modelSize.copy(size).multiplyScalar(scale);
            this.model.position.y += this.modelSize.y / 2;

            this.model.traverse(node => {
                if (node.isMesh) {
                    node.originalMaterial = node.material.clone();
                    if (node.material.name.toLowerCase().includes('paint') || node.material.name.toLowerCase().includes('body')) {
                        node.material.roughness = 0.05;
                        node.material.metalness = 0.9;
                    }
                    if (node.material.name.toLowerCase().includes('glass') || node.material.name.toLowerCase().includes('window')) {
                        node.material.transparent = true;
                        node.material.opacity = 0.4;
                    }
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            this.scene.add(this.model);
            this.initParticleSystem();
            document.getElementById('loading-overlay').classList.add('hidden');
            document.getElementById('sim-status').textContent = 'Simulation Active';
            document.getElementById('drag-coeff').textContent = (Math.random() * 0.5 + 0.1).toFixed(3);
            document.getElementById('re-num').textContent = Math.floor(Math.random() * 500000 + 100000).toLocaleString();
        }, undefined, (error) => {
            console.error('Load error:', error);
            document.getElementById('loading-overlay').classList.add('hidden');
        });
    }

    initParticleSystem() {
        if (this.flowLines) this.scene.remove(this.flowLines);
        if (this.glowLines) this.scene.remove(this.glowLines);

        const gridRows = 15;
        const gridCols = 30;
        const particleCount = gridRows * gridCols;
        const pointsPerLine = 60;
        
        const positions = new Float32Array(particleCount * pointsPerLine * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            this.resetParticle(positions, velocities, lifetimes, i, pointsPerLine);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const indices = [];
        for (let i = 0; i < particleCount; i++) {
            for (let j = 0; j < pointsPerLine - 1; j++) {
                const base = i * pointsPerLine + j;
                indices.push(base, base + 1);
            }
        }
        geometry.setIndex(indices);

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00f2ff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.flowLines = new THREE.LineSegments(geometry, lineMaterial);
        this.flowLines.frustumCulled = false;

        this.glowLines = this.flowLines.clone();
        this.glowLines.material = new THREE.LineBasicMaterial({
            color: 0x00f2ff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        
        this.particleData = { positions, velocities, lifetimes, count: particleCount, pointsPerLine };
        this.scene.add(this.flowLines);
        this.scene.add(this.glowLines);
        this.updateCinematicSetting();
        this.updateVisualization();
    }

    resetParticle(positions, velocities, lifetimes, index, pointsPerLine) {
        const angle = (this.windDir * Math.PI) / 180;
        const distance = 10;
        const gridCols = 30;
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        const gridRows = 15;

        const spreadX = this.modelSize ? this.modelSize.x * 1.6 : 8;
        const spreadY = this.modelSize ? this.modelSize.y * 1.4 : 5;
        const centerY = this.modelSize ? this.modelSize.y / 2 : 0;

        const startX = (col / (gridCols - 1) - 0.5) * spreadX;
        const startY = (row / (gridRows - 1)) * spreadY - (spreadY / 2) + centerY;
        const startZ = distance;

        const rotX = startX * Math.cos(angle) + startZ * Math.sin(angle);
        const rotZ = -startX * Math.sin(angle) + startZ * Math.cos(angle);

        for (let j = 0; j < pointsPerLine; j++) {
            const base = (index * pointsPerLine + j) * 3;
            positions[base] = rotX;
            positions[base + 1] = startY;
            positions[base + 2] = rotZ;
        }
        lifetimes[index] = Math.random() * 60 + 50;
    }

    updateParticles() {
        if (!this.flowLines || this.vizMode === 'pressure') return;
        const { positions, count, pointsPerLine, lifetimes } = this.particleData;
        const angle = (this.windDir * Math.PI) / 180;
        const windVec = new THREE.Vector3(-Math.sin(angle) * (this.windSpeed / 120), 0, -Math.cos(angle) * (this.windSpeed / 120));

        for (let i = 0; i < count; i++) {
            for (let j = pointsPerLine - 1; j > 0; j--) {
                const current = (i * pointsPerLine + j) * 3;
                const prev = (i * pointsPerLine + j - 1) * 3;
                positions[current] = positions[prev];
                positions[current + 1] = positions[prev + 1];
                positions[current + 2] = positions[prev + 2];
            }
            const head = (i * pointsPerLine) * 3;
            positions[head] += windVec.x;
            positions[head + 1] += windVec.y;
            positions[head + 2] += windVec.z;

            if (this.model && this.modelSize) {
                const currentPos = new THREE.Vector3(positions[head], positions[head + 1], positions[head + 2]);
                const dx = currentPos.x / (this.modelSize.x * 0.6);
                const dy = (currentPos.y - this.modelSize.y/2) / (this.modelSize.y * 0.6);
                const dz = currentPos.z / (this.modelSize.z * 0.6);
                const distDistSq = dx*dx + dy*dy + dz*dz;

                if (distDistSq < 1.0) {
                    const factor = (1.0 - Math.sqrt(distDistSq)) * 0.18;
                    positions[head + 1] += factor * 1.6;
                    positions[head] += (positions[head] > 0 ? factor : -factor) * 0.6;
                }

                const progress = currentPos.dot(windVec.clone().normalize());
                if (progress > this.modelSize.z * 0.3) {
                    const timeSeed = this.time * 6.0 + i;
                    const wakeFactor = (this.turbulence / 1500) * (progress / 4.0);
                    positions[head] += Math.sin(timeSeed * 0.8) * Math.cos(timeSeed * 0.4) * wakeFactor;
                    positions[head + 1] += Math.cos(timeSeed * 0.7) * Math.sin(timeSeed * 0.3) * wakeFactor;
                }
            }
            lifetimes[i]--;
            if (lifetimes[i] <= 0 || Math.abs(positions[head]) > 18 || Math.abs(positions[head + 2]) > 18) {
                this.resetParticle(positions, null, lifetimes, i, pointsPerLine);
            }
        }
        this.flowLines.geometry.attributes.position.needsUpdate = true;
        if(this.glowLines) this.glowLines.geometry.attributes.position.needsUpdate = true;
    }

    updateVisualization() {
        if (!this.model || !this.flowLines) return;
        const isSmoke = this.vizMode === 'smoke';
        const isStreamlines = this.vizMode === 'streamlines';
        const isPressure = this.vizMode === 'pressure';
        const colorHex = isSmoke ? 0xaaaaaa : 0x00f2ff;
        
        this.flowLines.material.color.setHex(colorHex);
        this.flowLines.material.opacity = isSmoke ? 0.3 : 0.7;
        this.flowLines.visible = (isSmoke || isStreamlines);
        
        if (this.glowLines) {
            this.glowLines.visible = this.flowLines.visible && this.cinematic;
            this.glowLines.material.color.setHex(colorHex);
        }

        const angle = (this.windDir * Math.PI) / 180;
        const windVec = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();

        this.model.traverse(node => {
            if (node.isMesh) {
                if (isPressure) {
                    node.material = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: false });
                    node.material.onBeforeCompile = (shader) => {
                        shader.uniforms.windDir = { value: windVec };
                        shader.fragmentShader = `
                            uniform vec3 windDir;
                            ${shader.fragmentShader}
                        `.replace(
                            `vec4 diffuseColor = vec4( diffuse, opacity );`,
                            `
                            float dotNL = dot(normalize(vNormal), normalize(windDir));
                            float heat = smoothstep(0.4, 0.9, dotNL);
                            vec3 heatColor = mix(vec3(0.0, 0.1, 0.4), vec3(1.0, 0.0, 0.0), heat);
                            vec4 diffuseColor = vec4( heatColor, opacity );
                            `
                        );
                    };
                } else {
                    node.material = node.originalMaterial;
                }
            }
        });
    }

    updateCinematicSetting() {
        if (!this.groundMirror || !this.bloomPass) return;
        this.groundMirror.visible = this.cinematic;
        this.bloomPass.enabled = this.cinematic;
        
        if (this.glowLines) {
            this.glowLines.visible = this.cinematic && (this.vizMode !== 'pressure');
        }

        if (this.model) {
            this.model.traverse(node => {
                if (node.isMesh) {
                    if (this.cinematic) {
                         if (node.material.name.toLowerCase().includes('paint')) {
                            node.material.roughness = 0.05;
                            node.material.metalness = 0.9;
                        }
                    } else {
                        node.material.roughness = 0.5;
                        node.material.metalness = 0.1;
                    }
                }
            });
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.01;
        this.controls.update();
        this.updateParticles();
        if (this.cinematic) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.viewer = new AeroViewer();
});
