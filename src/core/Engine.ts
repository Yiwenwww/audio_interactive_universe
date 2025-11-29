import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { vertexShader, fragmentShader } from './Shaders';
import { Generators, getColors } from './Generators';
import { AudioManager } from './Audio';

export class Engine {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points | null = null;
    linesMesh: THREE.LineSegments | null = null;
    material: THREE.ShaderMaterial | null = null;
    geometry: THREE.BufferGeometry | null = null;

    // Cursor
    cursorHead: THREE.Points | null = null;
    cursorTrail: THREE.Points | null = null;
    cursorMaterial: THREE.ShaderMaterial | null = null;
    trailPositions: THREE.Vector3[] = [];
    raycaster = new THREE.Raycaster();
    mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    mouseVector = new THREE.Vector2();
    worldMouse = new THREE.Vector3();

    // Data
    particleCount = 20000;
    currentPositions = new Float32Array();
    targetPositions = new Float32Array();
    currentColors = new Float32Array();
    connections: number[][] = [];

    // State
    isMorphing = false;
    morphSpeed = 0.05;
    simSpeed = 1.0;
    rotationSpeed = 1.0;
    autoRotate = true;
    pulseIntensity = 0.0;
    autoColorCycle = false;
    isDisposed = false;
    clock = new THREE.Clock();

    // Touch & State
    touchStartTimes: Record<number, number> = {};
    lastTap = 0;
    isMouseDown = false;

    styleList = ['Universe', 'Ink', 'Oil', 'Forest', 'Sketch', 'Cell', 'Ocean', 'Fire'];
    materialList = ['Particle', 'Glass', 'Plant', 'Silk', 'Metal', 'Rock'];
    currentStyleIndex = 0;
    currentEffectIndex = 0;

    // Audio
    audioManager: AudioManager;
    bassSensitivity = 1.0;
    trebleSensitivity = 1.0;
    isPinching = false;
    xyMode = false;

    constructor(container: HTMLElement, audioManager: AudioManager) {
        this.audioManager = audioManager;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 4000);
        this.camera.position.z = 1000;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,          // Smooth edges
            preserveDrawingBuffer: true,
            alpha: true,
            powerPreference: 'high-performance' // Request high-performance GPU
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Sharper on high-DPI screens
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        container.appendChild(this.renderer.domElement);

        this.onWindowResize = this.onWindowResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.animate = this.animate.bind(this);

        window.addEventListener('resize', this.onWindowResize);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('touchstart', this.onTouchStart, { passive: false });
        document.addEventListener('touchmove', this.onTouchMove, { passive: false });
        document.addEventListener('touchend', this.onTouchEnd);

        this.initParticles(this.particleCount);
        this.initLines();
        this.generateConnections();
        this.initCursor();

        this.animate();
    }

    initParticles(count: number) {
        if (this.particles) {
            this.scene.remove(this.particles);
            this.geometry?.dispose();
        }
        this.particleCount = count;
        this.geometry = new THREE.BufferGeometry();

        this.currentPositions = new Float32Array(count * 3);
        this.targetPositions = new Float32Array(count * 3);
        this.currentColors = new Float32Array(count * 3);

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                size: { value: 6.0 },
                uColorTint: { value: new THREE.Color(1, 1, 1) },
                uBass: { value: 0.0 }, uTreble: { value: 0.0 }, uWave: { value: 0.0 },
                uModX: { value: 0.5 }, uModY: { value: 0.0 },
                uTime: { value: 0.0 },
                uPlayColor: { value: 0.0 },
                uEffect: { value: 0.0 },
                uStyle: { value: 0.0 },
                uMousePos: { value: new THREE.Vector3(0, 0, 0) }
            },
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: true,      // Enable depth testing for proper z-ordering
            depthWrite: false,    // Don't write to depth buffer (particles are transparent)
            transparent: true,
            vertexColors: true
        });

        const initialPos = Generators.getUniverse(count);
        const initialCol = getColors(count);

        for (let i = 0; i < count * 3; i++) {
            this.currentPositions[i] = i < initialPos.length ? initialPos[i] : 0;
            this.targetPositions[i] = this.currentPositions[i];
            this.currentColors[i] = i < initialCol.length ? initialCol[i] : 1;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3));

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);
    }

    initLines() {
        const maxLines = 10000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxLines * 2 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.linesMesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
            color: 0x00ffff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending
        }));
        this.linesMesh.frustumCulled = false;
        this.scene.add(this.linesMesh);
        geometry.setDrawRange(0, 0); // Hide initially
    }

    generateConnections() {
        this.connections = [];
        const maxLines = 10000;
        let attempts = 0;
        while (this.connections.length < maxLines && attempts < 200000) {
            attempts++;
            const idxA = Math.floor(Math.random() * this.particleCount);
            const idxB = Math.floor(Math.random() * this.particleCount);
            if (idxA !== idxB) this.connections.push([idxA, idxB]);
        }
    }

    updateLines(density: number) {
        if (!this.linesMesh || !this.particles || density <= 0) {
            if (this.linesMesh) this.linesMesh.geometry.setDrawRange(0, 0);
            return;
        }

        const targetCount = Math.floor(this.connections.length * (density / 100));
        this.linesMesh.geometry.setDrawRange(0, targetCount * 2);

        const positions = (this.linesMesh.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

        for (let i = 0; i < targetCount; i++) {
            const [a, b] = this.connections[i];
            positions[i * 6] = this.currentPositions[a * 3];
            positions[i * 6 + 1] = this.currentPositions[a * 3 + 1];
            positions[i * 6 + 2] = this.currentPositions[a * 3 + 2];

            positions[i * 6 + 3] = this.currentPositions[b * 3];
            positions[i * 6 + 4] = this.currentPositions[b * 3 + 1];
            positions[i * 6 + 5] = this.currentPositions[b * 3 + 2];
        }
        this.linesMesh.geometry.attributes.position.needsUpdate = true;
        this.linesMesh.rotation.copy(this.particles.rotation);
    }

    syncLines() {
        if (!this.linesMesh || !this.particles || !this.linesMesh.geometry) return;

        const count = this.linesMesh.geometry.drawRange.count;
        if (count <= 0) return;

        const lineCount = count / 2;
        const positions = (this.linesMesh.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

        for (let i = 0; i < lineCount; i++) {
            const [a, b] = this.connections[i];
            positions[i * 6] = this.currentPositions[a * 3];
            positions[i * 6 + 1] = this.currentPositions[a * 3 + 1];
            positions[i * 6 + 2] = this.currentPositions[a * 3 + 2];

            positions[i * 6 + 3] = this.currentPositions[b * 3];
            positions[i * 6 + 4] = this.currentPositions[b * 3 + 1];
            positions[i * 6 + 5] = this.currentPositions[b * 3 + 2];
        }
        this.linesMesh.geometry.attributes.position.needsUpdate = true;
    }

    updateLineColor(r: number, g: number, b: number) {
        if (this.linesMesh) {
            (this.linesMesh.material as THREE.LineBasicMaterial).color.setRGB(r, g, b);
        }
    }

    initCursor() {
        // Cursor Material (Shared)
        const cursorVertex = vertexShader
            .replace('void main() {', 'attribute float alpha; varying float vTrailAlpha; void main() { vTrailAlpha = alpha;')
            .replace('vAlpha = 1.0;', 'vAlpha = 1.0;');
        const cursorFragment = fragmentShader
            .replace('varying float vAlpha;', 'varying float vAlpha; varying float vTrailAlpha;')
            .replace('gl_FragColor = vec4(finalColor, alpha);', 'gl_FragColor = vec4(finalColor, alpha * vTrailAlpha);');

        const headGeo = new THREE.BufferGeometry();
        headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
        headGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3));
        headGeo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array([1.0]), 1));

        const cursorUniforms = THREE.UniformsUtils.clone(this.material!.uniforms);
        this.cursorMaterial = new THREE.ShaderMaterial({
            uniforms: cursorUniforms,
            vertexShader: cursorVertex,
            fragmentShader: cursorFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        this.cursorHead = new THREE.Points(headGeo, this.cursorMaterial);
        this.cursorHead.frustumCulled = false;
        this.scene.add(this.cursorHead);

        const TRAIL_LENGTH = 30;
        const trailGeo = new THREE.BufferGeometry();
        const trailPos = new Float32Array(TRAIL_LENGTH * 3);
        const trailCols = new Float32Array(TRAIL_LENGTH * 3);
        const trailAlphas = new Float32Array(TRAIL_LENGTH);

        for (let i = 0; i < TRAIL_LENGTH; i++) {
            trailCols[i * 3] = 1; trailCols[i * 3 + 1] = 1; trailCols[i * 3 + 2] = 1;
            trailAlphas[i] = 1.0 - (i / TRAIL_LENGTH);
        }

        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCols, 3));
        trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

        this.cursorTrail = new THREE.Points(trailGeo, this.cursorMaterial);
        this.cursorTrail.frustumCulled = false;
        this.scene.add(this.cursorTrail);

        for (let i = 0; i < TRAIL_LENGTH; i++) this.trailPositions.push(new THREE.Vector3(0, 0, 0));
    }

    updateCursor() {
        if (!this.cursorHead || !this.cursorTrail) return;
        this.raycaster.setFromCamera(this.mouseVector, this.camera);
        const intersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.mousePlane, intersect);
        this.worldMouse.copy(intersect); // Store for shader interaction

        this.cursorHead.position.copy(intersect);
        this.trailPositions.pop();
        this.trailPositions.unshift(intersect.clone());
        const positions = (this.cursorTrail.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        for (let i = 0; i < this.trailPositions.length; i++) {
            positions[i * 3] = this.trailPositions[i].x;
            positions[i * 3 + 1] = this.trailPositions[i].y;
            positions[i * 3 + 2] = this.trailPositions[i].z;
        }
        this.cursorTrail.geometry.attributes.position.needsUpdate = true;

        // Sync uniforms
        if (this.cursorMaterial && this.material) {
            this.cursorMaterial.uniforms.uBass.value = this.material.uniforms.uBass.value;
            this.cursorMaterial.uniforms.uTreble.value = this.material.uniforms.uTreble.value;
            this.cursorMaterial.uniforms.uWave.value = this.material.uniforms.uWave.value;
            this.cursorMaterial.uniforms.uTime.value = this.material.uniforms.uTime.value;
            this.cursorMaterial.uniforms.uEffect.value = this.material.uniforms.uEffect.value;
            this.cursorMaterial.uniforms.uStyle.value = this.material.uniforms.uStyle.value;
            this.cursorMaterial.uniforms.size.value = this.material.uniforms.size.value * 1.5;

            // Sync Color (Handle Cycle vs Static)
            if (this.material.uniforms.uPlayColor.value > 0.5) {
                // Approximate cycle color for cursor
                const time = performance.now();
                const r = 0.5 + 0.5 * Math.cos(time * 0.0005 + 0.0);
                const g = 0.5 + 0.5 * Math.cos(time * 0.0005 + 2.0);
                const b = 0.5 + 0.5 * Math.cos(time * 0.0005 + 4.0);
                this.cursorMaterial.uniforms.uColorTint.value.setRGB(r, g, b);
            } else {
                this.cursorMaterial.uniforms.uColorTint.value.copy(this.material.uniforms.uColorTint.value);
            }
        }
    }

    morphTo(shapeName: string) {
        const genFunc = (Generators as any)[`get${shapeName}`] || Generators.getUniverse;
        const posData = genFunc(this.particleCount);
        for (let i = 0; i < this.particleCount * 3; i++) {
            this.targetPositions[i] = i < posData.length ? posData[i] : 0;
        }
        this.isMorphing = true;
    }

    setRenderStyle(name: string) {
        console.log('Engine: setRenderStyle called with', name);
        const styleMap: Record<string, number> = {
            'Universe': 0.0, 'Ink': 1.0, 'Oil': 2.0, 'Forest': 3.0, 'Sketch': 4.0,
            'Cell': 5.0, 'Ocean': 6.0, 'Fire': 7.0
        };
        if (this.material) {
            this.material.uniforms.uStyle.value = styleMap[name] !== undefined ? styleMap[name] : 0.0;
            this.material.needsUpdate = true;
        }

        // Handle Light Mode Class
        const body = document.body;
        body.classList.remove('light-mode');

        if (name === 'Universe') {
            this.renderer.setClearColor(0x000000);
            this.scene.fog!.color.setHex(0x000000);
            (this.scene.fog as THREE.FogExp2).density = 0.001;
            this.material!.blending = THREE.AdditiveBlending;
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x00ffff);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
            this.material!.uniforms.uColorTint.value.setRGB(1, 1, 1);
        } else if (name === 'Ink') {
            body.classList.add('light-mode');
            this.renderer.setClearColor(0xF5E9D3);
            this.scene.fog!.color.setHex(0xF5E9D3);
            (this.scene.fog as THREE.FogExp2).density = 0.0015;
            this.material!.blending = THREE.NormalBlending;
            this.material!.uniforms.uColorTint.value.setRGB(0.3, 0.4, 0.5);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x554433);
                (this.linesMesh.material as THREE.Material).blending = THREE.NormalBlending;
            }
        } else if (name === 'Oil') {
            this.renderer.setClearColor(0x0B0E28);
            this.scene.fog!.color.setHex(0x0B0E28);
            (this.scene.fog as THREE.FogExp2).density = 0.001;
            this.material!.blending = THREE.NormalBlending;
            this.material!.uniforms.uColorTint.value.setRGB(1.0, 0.8, 0.2);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0xFFA500);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
        } else if (name === 'Forest') {
            this.renderer.setClearColor(0x051a05);
            this.scene.fog!.color.setHex(0x051a05);
            this.material!.blending = THREE.AdditiveBlending;
            this.material!.uniforms.uColorTint.value.setRGB(0.4, 1.0, 0.5);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x55ff55);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
        } else if (name === 'Ocean') {
            this.renderer.setClearColor(0x00051a);
            this.scene.fog!.color.setHex(0x00051a);
            this.material!.blending = THREE.AdditiveBlending;
            this.material!.uniforms.uColorTint.value.setRGB(0.0, 0.6, 1.0);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x0088ff);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
        } else if (name === 'Fire') {
            this.renderer.setClearColor(0x1a0500);
            this.scene.fog!.color.setHex(0x1a0500);
            this.material!.blending = THREE.AdditiveBlending;
            this.material!.uniforms.uColorTint.value.setRGB(1.0, 0.4, 0.0);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0xff4400);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
        } else if (name === 'Cell') {
            this.renderer.setClearColor(0x000000);
            this.scene.fog!.color.setHex(0x000000);
            this.material!.blending = THREE.AdditiveBlending;
            this.material!.uniforms.uColorTint.value.setRGB(0.8, 0.0, 1.0);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x00ffaa);
                (this.linesMesh.material as THREE.Material).blending = THREE.AdditiveBlending;
            }
        } else if (name === 'Sketch') {
            body.classList.add('light-mode');
            this.renderer.setClearColor(0xffffff);
            this.scene.fog!.color.setHex(0xffffff);
            this.material!.blending = THREE.NormalBlending;
            this.material!.uniforms.uColorTint.value.setRGB(0.1, 0.1, 0.1);
            if (this.linesMesh) {
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setHex(0x333333);
                (this.linesMesh.material as THREE.Material).blending = THREE.NormalBlending;
            }
        }
    }

    setMaterialEffect(name: string) {
        console.log('Engine: setMaterialEffect called with', name);
        const effectMap: Record<string, number> = { 'Particle': 0.0, 'Glass': 1.0, 'Plant': 2.0, 'Silk': 3.0, 'Metal': 4.0, 'Rock': 5.0 };
        if (this.material) {
            this.material.uniforms.uEffect.value = effectMap[name] !== undefined ? effectMap[name] : 0.0;
            this.material.needsUpdate = true;
        }
    }

    onMouseMove(event: MouseEvent) {
        this.mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseVector.y = - (event.clientY / window.innerHeight) * 2 + 1;

        if (this.xyMode) {
            this.updateAudioModulation(event.clientX, event.clientY);
        }
    }

    onMouseDown(event: MouseEvent) {
        if ((event.target as HTMLElement).closest('#hologram-ui')) return;
        if (this.xyMode) {
            this.isPinching = true;
            this.audioManager.setDistortion(100);
            document.body.style.cursor = 'grabbing';
        }
    }

    onMouseUp() {
        if (this.xyMode) {
            this.isPinching = false;
            this.audioManager.setDistortion(0);
            document.body.style.cursor = 'default';
        }
    }

    updateAudioModulation(clientX: number, clientY: number) {
        const normX = clientX / window.innerWidth;
        const normY = clientY / window.innerHeight;

        const minFreq = 100; const maxFreq = 10000;
        const freq = minFreq + (maxFreq - minFreq) * normX;
        const maxQ = 20; const q = maxQ * (1 - normY);

        this.audioManager.setFilter(freq, q);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        this.isDisposed = true;
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.linesMesh) {
            this.linesMesh.geometry.dispose();
            (this.linesMesh.material as THREE.Material).dispose();
        }
        if (this.cursorHead) {
            this.cursorHead.geometry.dispose();
            (this.cursorHead.material as THREE.Material).dispose();
        }
        if (this.cursorTrail) {
            this.cursorTrail.geometry.dispose();
            (this.cursorTrail.material as THREE.Material).dispose();
        }
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('touchstart', this.onTouchStart);
        document.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
    }

    // Touch Handling

    onTouchStart(e: TouchEvent) {
        if ((e.target as HTMLElement).closest('#hologram-ui')) return; // Allow UI interaction
        e.preventDefault();

        const now = Date.now();
        const touches = e.touches;

        // Track touch start times
        for (let i = 0; i < touches.length; i++) {
            if (!this.touchStartTimes[touches[i].identifier]) {
                this.touchStartTimes[touches[i].identifier] = now;
            }
        }

        if (touches.length === 1) {
            // Double Tap Check (Mouse Click -> Pinch Toggle)
            if (now - this.lastTap < 300) {
                this.togglePinch();
                this.lastTap = 0;
            } else {
                this.lastTap = now;
            }
            // Update position immediately
            const t = touches[0];
            this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);

        } else if (touches.length === 2) {
            // Check logic: One Held + One Tap vs Two Finger Tap
            const t1 = touches[0];
            const t1Start = this.touchStartTimes[t1.identifier] || now;

            // If first finger held > 400ms, trigger Space logic (Material)
            if (now - t1Start > 400) {
                this.cycleMaterial();
            } else {
                // Likely simultaneous touch -> Tab logic (Style)
                // We can trigger this on touch start for responsiveness
                this.cycleStyle();
            }
        }
    }

    onTouchMove(e: TouchEvent) {
        if ((e.target as HTMLElement).closest('#hologram-ui')) return;
        e.preventDefault();
        if (e.touches.length > 0) {
            const t = e.touches[0];
            this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
        }
    }

    onTouchEnd(e: TouchEvent) {
        // Cleanup logic if needed
        // Remove ended touches from tracking
        for (let i = 0; i < e.changedTouches.length; i++) {
            delete this.touchStartTimes[e.changedTouches[i].identifier];
        }
    }

    // Helper Functions
    cycleMaterial() {
        this.currentEffectIndex = (this.currentEffectIndex + 1) % this.materialList.length;
        this.setMaterialEffect(this.materialList[this.currentEffectIndex]);
    }

    cycleStyle() {
        this.currentStyleIndex = (this.currentStyleIndex + 1) % this.styleList.length;
        this.setRenderStyle(this.styleList[this.currentStyleIndex]);
    }

    togglePinch() {
        this.isMouseDown = !this.isMouseDown; // Toggle visual force state

        if (this.isMouseDown) {
            this.isPinching = true;
            this.audioManager.setDistortion(100);
            console.log("Pinch Effect: ON");
        } else {
            this.isPinching = false;
            this.audioManager.setDistortion(0);
            console.log("Pinch Effect: OFF");
        }
    }

    animate() {
        if (this.isDisposed) return;
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        const dt = 60 * delta; // Normalize to 60 FPS speed

        const time = performance.now();
        TWEEN.update();

        if (this.isMorphing) {
            for (let i = 0; i < this.particleCount * 3; i++) {
                const diff = this.targetPositions[i] - this.currentPositions[i];
                if (Math.abs(diff) > 0.1) {
                    this.currentPositions[i] += diff * this.morphSpeed * dt;
                } else {
                    this.currentPositions[i] = this.targetPositions[i];
                }
            }
            // Wave/Pinch logic
            let waveFactor = 0;
            if (this.isPinching) waveFactor += 0.5;
            if (this.material) {
                this.material.uniforms.uWave.value = THREE.MathUtils.lerp(this.material.uniforms.uWave.value, waveFactor, 0.1);
            }
            if (this.geometry) this.geometry.attributes.position.needsUpdate = true;
            this.syncLines();

        } else if (this.pulseIntensity > 0 && this.material) {
            const pulse = Math.sin(time * 0.003 * (1 + this.pulseIntensity)) * 0.5 + 0.5;
            this.material.uniforms.uBass.value = pulse * this.pulseIntensity * 0.5;
        }

        // Audio Analysis & XY Mode Logic
        const analysis = this.audioManager.getAnalysis();
        if (analysis && this.material) {
            const { freq } = analysis;

            // Bass (Low Freqs)
            let bassSum = 0; const bassLimit = Math.floor(freq.length * 0.1);
            for (let i = 0; i < bassLimit; i++) bassSum += freq[i];
            const bassFactor = (bassSum / bassLimit) / 255;

            // Treble (High Freqs)
            let trebleSum = 0; const trebleStart = Math.floor(freq.length * 0.7);
            for (let i = trebleStart; i < freq.length; i++) trebleSum += freq[i];
            const trebleFactor = (trebleSum / (freq.length - trebleStart)) / 255;

            this.material.uniforms.uBass.value = THREE.MathUtils.lerp(this.material.uniforms.uBass.value, bassFactor * this.bassSensitivity, 0.08);
            this.material.uniforms.uTreble.value = THREE.MathUtils.lerp(this.material.uniforms.uTreble.value, trebleFactor * this.trebleSensitivity, 0.03);

            // Restore Original Logic: Audio also drives the Wave/Ripple effect
            // If significant treble/bass, trigger wave
            if (trebleFactor > 0.4) {
                const waveTarget = (trebleFactor - 0.4) * 1.5; // Scale up slightly less
                this.material.uniforms.uWave.value = THREE.MathUtils.lerp(this.material.uniforms.uWave.value, waveTarget, 0.02);
            } else {
                // Smoothly decay wave if below threshold
                this.material.uniforms.uWave.value = THREE.MathUtils.lerp(this.material.uniforms.uWave.value, 0, 0.02);
            }
        }

        // XY Mode Modulation (Independent of Audio Analysis)
        if (this.xyMode && this.material) {
            this.material.uniforms.uModX.value = this.mouseVector.x * 0.5 + 0.5; // 0..1
            this.material.uniforms.uModY.value = this.mouseVector.y * 0.5 + 0.5; // 0..1
        }

        if (this.material) {
            this.material.uniforms.uTime.value = time * 0.001;
            this.material.uniforms.uMousePos.value.copy(this.worldMouse);

            // Sync line color with cycle if active
            if (this.autoColorCycle && this.linesMesh) {
                const r = 0.5 + 0.5 * Math.cos(time * 0.0005 + 0.0);
                const g = 0.5 + 0.5 * Math.cos(time * 0.0005 + 2.0);
                const b = 0.5 + 0.5 * Math.cos(time * 0.0005 + 4.0);
                (this.linesMesh.material as THREE.LineBasicMaterial).color.setRGB(r, g, b);
            }
        }

        if (this.autoRotate && this.particles) {
            this.particles.rotation.y += 0.002 * this.rotationSpeed * dt;
            if (this.linesMesh) this.linesMesh.rotation.y += 0.002 * this.rotationSpeed * dt;
        }

        // Mouse Rotation (Camera Orbit)
        const targetCamX = this.mouseVector.x * 300;
        const targetCamY = this.mouseVector.y * 300;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 0.05;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        this.updateCursor();
        this.renderer.render(this.scene, this.camera);
    }
}



