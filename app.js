let scene;
let camera;
let renderer;
let controls;
let raycaster;
let pointer;

let currentModel = null;
let currentModelDef = null;
let currentMixer = null;
let currentActions = {};
let currentClips = [];
let wireframeEnabled = false;
let lightingEnabled = true;
let autoRotateEnabled = false;

const lights = {
    ambient: null,
    key: null,
    fill: null,
    rim: null,
    hemi: null,
};

const animState = {
    squash: null,
    tab: null,
    twist: null,
    axis: "y",
    baseScale: new THREE.Vector3(1, 1, 1),
    basePosition: new THREE.Vector3(0, 0, 0),
    baseRotation: new THREE.Euler(0, 0, 0),
    tabMesh: null,
    tabBasePosition: new THREE.Vector3(0, 0, 0),
    tabBaseRotation: new THREE.Euler(0, 0, 0),
    anchorCenter: new THREE.Vector3(0, 0, 0),
    anchorSize: new THREE.Vector3(1, 1, 1),
    anchorName: "N/A",
};

const MODEL_LIBRARY = [
    {
        id: "soda_can_crush",
        title: "Soda Can Crush",
        tag: "GLB",
        file: "./models/soda_can_crush.glb",
        description: "Geometry + material + lighting + camera upgraded. Embedded clips: KeyAction / TabAction.",
        camera: { yaw: 48, pitch: 32, dist: 2.1 },
        fallbackActions: ["squash", "twist"],
        remixGeometry: false,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/coke01.png",
    },
    {
        id: "soda_can_opening",
        title: "Soda Can Opening",
        tag: "GLB",
        file: "./models/soda_can_opening.glb",
        description: "Opening structure and readability improved. Embedded clips: Ring_pullAction / TabAction.",
        camera: { yaw: 38, pitch: 36, dist: 2.0 },
        fallbackActions: ["tab", "twist"],
        remixGeometry: false,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/_can%20lid.png",
    },
    {
        id: "coca_cola_bottle",
        title: "Coca-Cola Bottle",
        tag: "GLB",
        file: "./models/coca_cola_bottle.glb",
        description: "Custom export from Coca_Cola.blend with dents, polished material response, and normalized center.",
        camera: { yaw: 44, pitch: 30, dist: 2.0 },
        fallbackActions: ["twist", "squash"],
        remixGeometry: false,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/coke01.png",
    },
    {
        id: "coke_can",
        title: "Coke Can",
        tag: "GLB",
        file: "./models/coke_can.glb",
        description: "Downloaded model with custom dents and interaction fallback actions.",
        camera: { yaw: 42, pitch: 28, dist: 2.2 },
        fallbackActions: ["squash", "tab", "twist", "remix"],
        remixGeometry: true,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/coke01.png",
    },
    {
        id: "fanta_can",
        title: "Fanta Can",
        tag: "GLB",
        file: "./models/fanta_can.glb",
        description: "Downloaded model with custom dents and interaction fallback actions.",
        camera: { yaw: 42, pitch: 28, dist: 2.2 },
        fallbackActions: ["squash", "tab", "twist", "remix"],
        remixGeometry: true,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/fanta01.png",
    },
    {
        id: "sprite_can",
        title: "Sprite Can",
        tag: "GLB",
        file: "./models/sprite_can.glb",
        description: "Downloaded model with custom dents and interaction fallback actions.",
        camera: { yaw: 42, pitch: 28, dist: 2.2 },
        fallbackActions: ["squash", "tab", "twist", "remix"],
        remixGeometry: true,
        media: "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/sprite01.png",
    },
];

const MODEL_MAP = MODEL_LIBRARY.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
}, {});

const BRIGHT_MODEL_IDS = new Set([
    "soda_can_crush",
    "soda_can_opening",
    "coke_can",
    "fanta_can",
    "sprite_can",
]);

const LIGHT_PRESETS = {
    default: { ambient: 0.24, key: 0.62, fill: 0.24, rim: 0.24, hemi: 0.18, exposure: 0.9 },
    bright: { ambient: 0.42, key: 1.08, fill: 0.62, rim: 0.42, hemi: 0.34, exposure: 1.2 },
};

const fallbackHandlers = {
    squash: () => startSquashAnimation(),
    tab: () => startTabAnimation(),
    twist: () => startTwistAnimation(),
    remix: () => applyRemixToCurrentModel(),
};

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
    return t * t * (3 - 2 * t);
}

function getDominantAxis(sizeVec3) {
    if (sizeVec3.x >= sizeVec3.y && sizeVec3.x >= sizeVec3.z) return "x";
    if (sizeVec3.y >= sizeVec3.x && sizeVec3.y >= sizeVec3.z) return "y";
    return "z";
}

function buildGallery() {
    const list = document.getElementById("modelGallery");
    list.innerHTML = "";
    MODEL_LIBRARY.forEach((model) => {
        const card = document.createElement("button");
        card.className = "model-card";
        card.dataset.model = model.id;
        card.innerHTML = `
            <span class="tag">${model.tag}</span>
            <h4>${model.title}</h4>
            <p>${model.description}</p>
        `;
        card.addEventListener("click", () => loadModel(model.id));
        list.appendChild(card);
    });
}

function setActiveCard(modelId) {
    document.querySelectorAll(".model-card").forEach((card) => {
        card.classList.toggle("active", card.dataset.model === modelId);
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabs.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const target = btn.dataset.tab;
            document.querySelectorAll(".tab").forEach((panel) => {
                panel.classList.remove("active");
            });
            document.getElementById(`tab-${target}`).classList.add("active");
        });
    });
}

function toggleGalleryPanel() {
    const panel = document.getElementById("galleryPanel");
    panel.classList.toggle("collapsed");
}

function toggleInfoPanel() {
    const panel = document.getElementById("infoPanel");
    panel.classList.toggle("collapsed");
}

function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdcdde1);

    camera = new THREE.PerspectiveCamera(60, 1, 0.05, 1000);
    camera.position.set(2.4, 1.5, 2.8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.physicallyCorrectLights = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const viewer = document.getElementById("viewer");
    viewer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.7;
    controls.maxDistance = 10;

    lights.ambient = new THREE.AmbientLight(0xffffff, 0.24);
    lights.key = new THREE.DirectionalLight(0xffffff, 0.62);
    lights.key.position.set(1.2, 1.6, 1.3);
    lights.fill = new THREE.PointLight(0xeff4ff, 0.24, 20, 2);
    lights.fill.position.set(-1.7, 0.8, 1.2);
    lights.rim = new THREE.SpotLight(0xffffff, 0.24, 30, Math.PI / 5, 0.35, 2);
    lights.rim.position.set(0.0, -2.5, 1.7);
    lights.rim.target.position.set(0, 0, 0);
    lights.hemi = new THREE.HemisphereLight(0xffffff, 0xd5e5ff, 0.18);

    scene.add(lights.ambient, lights.key, lights.fill, lights.rim, lights.rim.target, lights.hemi);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    renderer.domElement.addEventListener("click", onViewerClick);

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
    applyLightingPreset("coca_cola_bottle");
}

function onWindowResize() {
    const viewer = document.getElementById("viewer");
    const w = viewer.clientWidth;
    const h = viewer.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, true);
}

function stopAndClearMixer() {
    if (currentMixer) {
        currentMixer.stopAllAction();
        currentMixer.uncacheRoot(currentModel);
    }
    currentMixer = null;
    currentActions = {};
    currentClips = [];
}

function applyLightingPreset(modelId) {
    const preset = BRIGHT_MODEL_IDS.has(modelId) ? LIGHT_PRESETS.bright : LIGHT_PRESETS.default;
    renderer.toneMappingExposure = preset.exposure;
    if (lights.ambient) lights.ambient.intensity = preset.ambient;
    if (lights.key) lights.key.intensity = preset.key;
    if (lights.fill) lights.fill.intensity = preset.fill;
    if (lights.rim) lights.rim.intensity = preset.rim;
    if (lights.hemi) lights.hemi.intensity = preset.hemi;
}

function applyBrightMaterialPass(modelId) {
    if (!currentModel || !BRIGHT_MODEL_IDS.has(modelId)) return;
    currentModel.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
            if (!mat) return;
            if (mat.color) {
                const hsl = { h: 0, s: 0, l: 0 };
                mat.color.getHSL(hsl);
                hsl.s = clamp(hsl.s * 1.08, 0, 1);
                hsl.l = clamp(hsl.l * 1.18 + 0.02, 0, 1);
                mat.color.setHSL(hsl.h, hsl.s, hsl.l);
            }
            if ("roughness" in mat) mat.roughness = clamp((mat.roughness ?? 0.5) * 0.72, 0.03, 1);
            if ("metalness" in mat) mat.metalness = clamp((mat.metalness ?? 0) * 0.88, 0, 1);
            if ("envMapIntensity" in mat) mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1.0, 1.35);
            if ("emissive" in mat && mat.color) mat.emissive.copy(mat.color).multiplyScalar(0.02);
            if ("emissiveIntensity" in mat) mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 0.28);
            mat.needsUpdate = true;
        });
    });
}

function resetCustomAnim() {
    animState.squash = null;
    animState.tab = null;
    animState.twist = null;
    animState.tabMesh = null;
}

function cloneMaterials(root) {
    root.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        if (Array.isArray(obj.material)) {
            obj.material = obj.material.map((m) => (m ? m.clone() : m));
        } else {
            obj.material = obj.material.clone();
        }
    });
}

function findTabMesh(root) {
    let candidate = null;
    root.traverse((obj) => {
        if (!obj.isMesh) return;
        const n = (obj.name || "").toLowerCase();
        if (n.includes("torus") || n.includes("tab") || n.includes("ring")) {
            if (!candidate) candidate = obj;
        }
    });
    return candidate;
}

function findBodyMesh(root) {
    let best = null;
    let bestScore = -Infinity;
    root.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry || !obj.visible) return;
        const name = (obj.name || "").toLowerCase();
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        const bb = obj.geometry.boundingBox;
        if (!bb) return;
        const s = new THREE.Vector3();
        bb.getSize(s);
        const dims = [s.x, s.y, s.z].sort((a, b) => a - b);
        if (dims[2] < 1e-6) return;
        let score = s.x * s.y * s.z;
        const maxDim = Math.max(s.x, s.y, s.z, 1e-6);
        const minDim = Math.max(Math.min(s.x, s.y, s.z), 1e-6);
        const thinness = minDim / maxDim;
        const midDim = dims[1];
        const radialSimilarity = dims[0] / Math.max(midDim, 1e-6);
        const aspect = dims[2] / Math.max((dims[0] + dims[1]) * 0.5, 1e-6);
        const radialScore = clamp((radialSimilarity - 0.45) / 0.55, 0, 1);
        const aspectScore = 1 - clamp(Math.abs(aspect - 2.0) / 3.0, 0, 1);
        const canShapeBoost = 0.25 + 1.75 * (radialScore * aspectScore);
        const flatPenalty = clamp((thinness - 0.08) / 0.35, 0.02, 1);
        score *= canShapeBoost;
        score *= flatPenalty;

        if (
            name.includes("ring") ||
            name.includes("torus") ||
            name.includes("tab") ||
            name.includes("pull") ||
            name.includes("loop") ||
            name.includes("curve") ||
            name.includes("plane") ||
            name.includes("floor") ||
            name.includes("ground")
        ) {
            score *= 0.06;
        }

        const posAttr = obj.geometry.attributes.position;
        const vertexCount = posAttr ? posAttr.count : 0;
        score *= clamp(vertexCount / 380, 0.18, 1.22);

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        if (mats.some((m) => m && m.map)) score *= 1.25;
        if (score > bestScore) {
            bestScore = score;
            best = obj;
        }
    });
    return best;
}

function computeFocusCenter(root) {
    const candidates = [];
    root.updateMatrixWorld(true);

    root.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry || !obj.visible) return;
        const name = (obj.name || "").toLowerCase();
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
        if (dims[2] < 1e-6) return;

        const volume = Math.max(size.x * size.y * size.z, 1e-8);
        const thinness = dims[0] / dims[2];
        const aspect = dims[2] / Math.max((dims[0] + dims[1]) * 0.5, 1e-6);

        let score = volume;
        if (name.includes("ring") || name.includes("torus") || name.includes("tab") || name.includes("pull") || name.includes("loop")) {
            score *= 0.03;
        }
        if (thinness < 0.08) {
            score *= 0.15;
        }
        if (aspect < 0.65 || aspect > 5.0) {
            score *= 0.45;
        }

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        if (mats.some((m) => m && m.map)) score *= 1.08;

        const center = box.getCenter(new THREE.Vector3());
        candidates.push({ center, score });
    });

    if (!candidates.length) {
        return new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
    }

    candidates.sort((a, b) => b.score - a.score);
    const takeCount = Math.max(1, Math.min(candidates.length, Math.ceil(candidates.length * 0.4)));
    let wsum = 0;
    const out = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < takeCount; i += 1) {
        const w = Math.max(candidates[i].score, 1e-6);
        out.addScaledVector(candidates[i].center, w);
        wsum += w;
    }
    if (wsum > 1e-6) out.multiplyScalar(1 / wsum);
    return out;
}

function computeTrimmedBounds(root, trimRatio = 0.08) {
    const xs = [];
    const ys = [];
    const zs = [];
    root.updateMatrixWorld(true);

    root.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes.position) return;
        const posAttr = obj.geometry.attributes.position;
        const p = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i += 1) {
            p.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(obj.matrixWorld);
            xs.push(p.x);
            ys.push(p.y);
            zs.push(p.z);
        }
    });

    if (xs.length < 20) {
        const box = new THREE.Box3().setFromObject(root);
        const c = box.getCenter(new THREE.Vector3());
        const s = box.getSize(new THREE.Vector3());
        return { center: c, size: s };
    }

    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    zs.sort((a, b) => a - b);

    const idx = (arr, q) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor((arr.length - 1) * q)))];
    const lo = clamp(trimRatio, 0, 0.35);
    const hi = 1 - lo;

    const min = new THREE.Vector3(idx(xs, lo), idx(ys, lo), idx(zs, lo));
    const max = new THREE.Vector3(idx(xs, hi), idx(ys, hi), idx(zs, hi));
    const center = min.clone().add(max).multiplyScalar(0.5);
    const size = max.clone().sub(min);
    return { center, size };
}

function applyRemixToCurrentModel() {
    if (!currentModel || !currentModelDef || !currentModelDef.remixGeometry) return;
    cloneMaterials(currentModel);

    const presetById = {
        coke_can: { hueShift: -0.01, sat: 1.08, light: 1.12, dents: 0.015 },
        fanta_can: { hueShift: 0.008, sat: 1.14, light: 1.16, dents: 0.017 },
        sprite_can: { hueShift: -0.02, sat: 1.08, light: 1.14, dents: 0.014 },
    };
    const p = presetById[currentModelDef.id] || { hueShift: 0, sat: 1.06, light: 1.08, dents: 0.014 };

    currentModel.traverse((obj) => {
        if (!obj.isMesh) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
            if (!mat || !mat.color) return;
            const hsl = { h: 0, s: 0, l: 0 };
            mat.color.getHSL(hsl);
            hsl.h = (hsl.h + p.hueShift + 1) % 1;
            hsl.s = clamp(hsl.s * p.sat, 0, 1);
            hsl.l = clamp(hsl.l * p.light, 0, 1);
            mat.color.setHSL(hsl.h, hsl.s, hsl.l);
            mat.roughness = clamp((mat.roughness ?? 0.5) * 0.9 + 0.04, 0.08, 1.0);
            mat.needsUpdate = true;
        });
    });

    const body = findBodyMesh(currentModel);
    if (!body || !body.geometry || !body.geometry.attributes.position) return;

    const geom = body.geometry.clone();
    body.geometry = geom;
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bb.getCenter(center);
    bb.getSize(size);

    const axis = animState.axis;
    const pos = geom.attributes.position;
    const arr = pos.array;
    const src = new Float32Array(arr);
    const radial = axis === "y" ? (size.x + size.z) * 0.5 : (axis === "x" ? (size.y + size.z) * 0.5 : (size.x + size.y) * 0.5);
    const amp = radial * p.dents;

    for (let i = 0; i < arr.length; i += 3) {
        const bx = src[i];
        const by = src[i + 1];
        const bz = src[i + 2];
        let c1;
        let c2;
        let h;
        if (axis === "x") {
            c1 = by - center.y;
            c2 = bz - center.z;
            h = (bx - bb.min.x) / Math.max(bb.max.x - bb.min.x, 1e-6);
        } else if (axis === "z") {
            c1 = bx - center.x;
            c2 = by - center.y;
            h = (bz - bb.min.z) / Math.max(bb.max.z - bb.min.z, 1e-6);
        } else {
            c1 = bx - center.x;
            c2 = bz - center.z;
            h = (by - bb.min.y) / Math.max(bb.max.y - bb.min.y, 1e-6);
        }

        const r = Math.sqrt(c1 * c1 + c2 * c2) + 1e-7;
        const a = Math.atan2(c2, c1);
        const band = smoothstep(0.1, 0.24, h) * (1 - smoothstep(0.76, 0.9, h));
        const inset = -amp * band * (0.55 + 0.45 * Math.sin(a * 8.0));
        const scale = (r + inset) / r;

        const nc1 = c1 * scale;
        const nc2 = c2 * scale;
        if (axis === "x") {
            arr[i + 1] = center.y + nc1;
            arr[i + 2] = center.z + nc2;
        } else if (axis === "z") {
            arr[i] = center.x + nc1;
            arr[i + 1] = center.y + nc2;
        } else {
            arr[i] = center.x + nc1;
            arr[i + 2] = center.z + nc2;
        }
    }

    pos.needsUpdate = true;
    geom.computeVertexNormals();
}

function updateViewerInfo(modelDef, clips) {
    document.getElementById("viewerTitle").textContent = modelDef.title;
    document.getElementById("viewerSub").textContent = `Loaded from ${modelDef.file}`;
    document.getElementById("infoTitle").textContent = modelDef.title;
    document.getElementById("infoContent").textContent = modelDef.description;
    const media = document.getElementById("mediaImage");
    if (media) {
        media.src = modelDef.media || "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/coke01.png";
        media.onerror = () => {
            media.src = "./models/coca-cola-coke-fanta-sprite-pepsi-7up-cans/coke01.png";
        };
    }

    const stats = document.getElementById("stats");
    stats.innerHTML = "";
    const items = [
        `Embedded clips: ${clips.length}`,
        `Wireframe: ${wireframeEnabled ? "On" : "Off"}`,
        `Lighting: ${lightingEnabled ? "On" : "Off"}`,
        `Anchor mesh: ${animState.anchorName}`,
        `Axis: ${animState.axis.toUpperCase()}`,
    ];
    items.forEach((txt) => {
        const d = document.createElement("div");
        d.className = "stat-item";
        d.textContent = txt;
        stats.appendChild(d);
    });
}

function fitCamera(modelDef) {
    if (!currentModel) return;
    const center = animState.anchorCenter.clone();
    const size = animState.anchorSize.clone();
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
    const fitByHeight = (size.y * 0.5) / Math.tan(fovV / 2);
    const fitByWidth = (size.x * 0.5) / Math.tan(fovH / 2);
    const baseDist = Math.max(fitByHeight, fitByWidth, size.z * 0.65);
    const dist = Math.max(1.1, baseDist * 1.26 * modelDef.camera.dist);
    const yaw = THREE.MathUtils.degToRad(modelDef.camera.yaw);
    const pitch = THREE.MathUtils.degToRad(modelDef.camera.pitch);
    const x = center.x + dist * Math.cos(pitch) * Math.sin(yaw);
    const y = center.y + dist * Math.sin(pitch);
    const z = center.z + dist * Math.cos(pitch) * Math.cos(yaw);
    camera.position.set(x, y, z);
    controls.target.copy(center);
    camera.lookAt(center);
    controls.update();
}

function refreshAnchorFromCurrentModel() {
    if (!currentModel) return;
    currentModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(currentModel);
    const size = box.getSize(new THREE.Vector3());
    const focusCenter = computeFocusCenter(currentModel);
    animState.anchorCenter.copy(focusCenter);
    animState.anchorSize.set(
        Math.max(size.x, 1e-3),
        Math.max(size.y, 1e-3),
        Math.max(size.z, 1e-3)
    );
    animState.axis = getDominantAxis(animState.anchorSize);
}

function createMixerAndActions(gltf) {
    stopAndClearMixer();
    if (!gltf.animations || !gltf.animations.length) return;

    currentMixer = new THREE.AnimationMixer(currentModel);
    currentClips = gltf.animations.slice();
    currentActions = {};
    currentClips.forEach((clip) => {
        const action = currentMixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        currentActions[clip.name || `Clip_${Math.random().toString(36).slice(2, 6)}`] = action;
    });
}

function playClip(name) {
    if (!currentMixer || !currentActions[name]) return;
    Object.values(currentActions).forEach((action) => action.stop());
    const action = currentActions[name];
    action.reset();
    action.play();
}

function playAllClips() {
    if (!currentClips.length) return;
    let index = 0;
    function runNext() {
        if (index >= currentClips.length) return;
        const clip = currentClips[index];
        index += 1;
        playClip(clip.name);
        setTimeout(runNext, Math.max(250, clip.duration * 1000 + 120));
    }
    runNext();
}

function renderDynamicActions() {
    const host = document.getElementById("dynamicActions");
    host.innerHTML = "";

    if (currentClips.length > 0) {
        currentClips.forEach((clip) => {
            const btn = document.createElement("button");
            btn.className = "action-btn";
            btn.textContent = `Play ${clip.name || "Clip"}`;
            btn.addEventListener("click", () => playClip(clip.name));
            host.appendChild(btn);
        });
        const allBtn = document.createElement("button");
        allBtn.className = "action-btn";
        allBtn.textContent = "Play All Clips";
        allBtn.addEventListener("click", playAllClips);
        host.appendChild(allBtn);
        return;
    }

    const actions = currentModelDef ? currentModelDef.fallbackActions : [];
    if (!actions.length) {
        const empty = document.createElement("span");
        empty.className = "hint";
        empty.textContent = "No model-specific actions available.";
        host.appendChild(empty);
        return;
    }

    const labels = { squash: "Squash", tab: "Pull Tab", twist: "Twist", remix: "Detail" };
    actions.forEach((key) => {
        const btn = document.createElement("button");
        btn.className = "action-btn";
        btn.textContent = labels[key] || key;
        btn.addEventListener("click", () => fallbackHandlers[key] && fallbackHandlers[key]());
        host.appendChild(btn);
    });
}

function loadModel(modelId) {
    const def = MODEL_MAP[modelId];
    if (!def) return;
    setActiveCard(modelId);
    applyLightingPreset(modelId);

    if (currentModel) {
        scene.remove(currentModel);
    }
    stopAndClearMixer();
    resetCustomAnim();
    currentModel = null;
    currentModelDef = def;

    const loader = new THREE.GLTFLoader();
    loader.load(
        `${def.file}?v=20260406_2146`,
        (gltf) => {
            currentModel = gltf.scene;

            currentModel.traverse((obj) => {
                if (obj.isLight) obj.visible = false;
                if (obj.isMesh && obj.material) {
                    const objName = (obj.name || "").toLowerCase();
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    mats.forEach((m) => {
                        if (!m) return;
                        m.wireframe = wireframeEnabled;
                        const matName = (m.name || "").toLowerCase();
                        const glassHint =
                            matName.includes("material.002") ||
                            matName.includes("glass") ||
                            matName.includes("bottle");
                        const liquidHint =
                            objName.includes("colaliquid") ||
                            matName.includes("colaliquid") ||
                            matName.includes("liquid");

                        if (glassHint || ("transmission" in m && m.transmission > 0.0)) {
                            if ("color" in m) m.color.setRGB(0.82, 0.86, 0.9);
                            if ("metalness" in m) m.metalness = 0.0;
                            if ("roughness" in m) m.roughness = 0.06;
                            if ("transparent" in m) m.transparent = true;
                            if ("opacity" in m) m.opacity = 0.42;
                            if ("depthWrite" in m) m.depthWrite = false;
                            if ("side" in m) m.side = THREE.FrontSide;

                            // If transmission exists, keep it moderate to avoid pure-black appearance
                            // when no high-quality environment map is available.
                            if ("transmission" in m) m.transmission = 0.45;
                            if ("thickness" in m) m.thickness = 0.02;
                            if ("ior" in m) m.ior = 1.46;
                            if ("envMapIntensity" in m) m.envMapIntensity = 1.0;

                            m.needsUpdate = true;
                        }

                        if (liquidHint) {
                            const isCocaLiquid = def.id === "coca_cola_bottle";
                            if ("color" in m) m.color.setRGB(
                                isCocaLiquid ? 0.05 : 0.19,
                                isCocaLiquid ? 0.012 : 0.055,
                                isCocaLiquid ? 0.006 : 0.022
                            );
                            if ("metalness" in m) m.metalness = 0.0;
                            if ("roughness" in m) m.roughness = isCocaLiquid ? 0.02 : 0.04;
                            if ("transparent" in m) m.transparent = true;
                            if ("opacity" in m) m.opacity = isCocaLiquid ? 0.62 : 0.30;
                            if ("depthWrite" in m) m.depthWrite = true;
                            if ("depthTest" in m) m.depthTest = true;
                            if ("side" in m) m.side = THREE.FrontSide;
                            if ("transmission" in m) m.transmission = 0.0;
                            if ("ior" in m) m.ior = 1.34;
                            if ("alphaTest" in m) m.alphaTest = 0.0;
                            if ("blending" in m) m.blending = THREE.NormalBlending;
                            if ("polygonOffset" in m) {
                                m.polygonOffset = true;
                                m.polygonOffsetFactor = 1.0;
                                m.polygonOffsetUnits = 1.0;
                            }
                            m.needsUpdate = true;
                            obj.renderOrder = 1;
                        }
                    });

                    // Keep glass drawn after liquid for more stable blending.
                    if (objName.includes("bottle")) {
                        obj.renderOrder = 2;
                    }
                }
            });
            scene.add(currentModel);
            currentModel.scale.setScalar(1);
            currentModel.position.set(0, 0, 0);
            currentModel.rotation.set(0, 0, 0);

            // Stable normalization: scale from full AABB size, keep centered pivot at world origin.
            const rawBox = new THREE.Box3().setFromObject(currentModel);
            const rawCenter = rawBox.getCenter(new THREE.Vector3());
            currentModel.position.sub(rawCenter);
            currentModel.updateMatrixWorld(true);
            const centeredBox = new THREE.Box3().setFromObject(currentModel);
            const centeredSize = centeredBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(centeredSize.x, centeredSize.y, centeredSize.z, 1e-6);
            const scale = 1.65 / maxDim;
            currentModel.scale.setScalar(scale);
            currentModel.updateMatrixWorld(true);
            const finalBox = new THREE.Box3().setFromObject(currentModel);
            const focusCenter = computeFocusCenter(currentModel);
            currentModel.position.sub(focusCenter);
            currentModel.updateMatrixWorld(true);
            const finalBoxCentered = new THREE.Box3().setFromObject(currentModel);
            const anchorSizeCentered = finalBoxCentered.getSize(new THREE.Vector3());
            const safeSize = new THREE.Vector3(
                Math.max(anchorSizeCentered.x, 1e-3),
                Math.max(anchorSizeCentered.y, 1e-3),
                Math.max(anchorSizeCentered.z, 1e-3)
            );

            animState.anchorCenter.set(0, 0, 0);
            animState.anchorSize.copy(safeSize);
            animState.axis = getDominantAxis(safeSize);
            animState.anchorName = "focus_center";
            animState.baseScale.copy(currentModel.scale);
            animState.basePosition.copy(currentModel.position);
            animState.baseRotation.copy(currentModel.rotation);
            animState.tabMesh = findTabMesh(currentModel);
            if (animState.tabMesh) {
                animState.tabBasePosition.copy(animState.tabMesh.position);
                animState.tabBaseRotation.copy(animState.tabMesh.rotation);
            }

            if (def.remixGeometry) {
                applyRemixToCurrentModel();
            }
            applyBrightMaterialPass(def.id);

            refreshAnchorFromCurrentModel();

            createMixerAndActions(gltf);
            renderDynamicActions();
            updateViewerInfo(def, currentClips);
            fitCamera(def);
        }
    );
}

function startSquashAnimation() {
    if (!currentModel || animState.squash) return;
    animState.squash = {
        start: performance.now(),
        duration: 880,
        baseScale: animState.baseScale.clone(),
    };
}

function startTabAnimation() {
    if (!currentModel || !animState.tabMesh || animState.tab) return;
    animState.tab = {
        start: performance.now(),
        duration: 760,
        baseRotation: animState.tabBaseRotation.clone(),
        basePosition: animState.tabBasePosition.clone(),
    };
}

function startTwistAnimation() {
    if (!currentModel || animState.twist) return;
    animState.twist = {
        start: performance.now(),
        duration: 920,
        baseRotation: animState.baseRotation.clone(),
    };
}

function updateFallbackAnimations(now) {
    if (!currentModel) return;

    if (animState.squash) {
        const a = animState.squash;
        const t = clamp((now - a.start) / a.duration, 0, 1);
        const k = Math.sin(Math.PI * t);
        const squash = 1 - 0.24 * k;
        const stretch = 1 + 0.12 * k;
        let sx = a.baseScale.x;
        let sy = a.baseScale.y;
        let sz = a.baseScale.z;
        if (animState.axis === "x") {
            sx *= squash; sy *= stretch; sz *= stretch;
        } else if (animState.axis === "z") {
            sx *= stretch; sy *= stretch; sz *= squash;
        } else {
            sx *= stretch; sy *= squash; sz *= stretch;
        }
        currentModel.scale.set(sx, sy, sz);
        if (t >= 1) {
            currentModel.scale.copy(a.baseScale);
            animState.squash = null;
        }
    }

    if (animState.tab && animState.tabMesh) {
        const a = animState.tab;
        const t = clamp((now - a.start) / a.duration, 0, 1);
        const k = t < 0.55 ? smoothstep(0, 1, t / 0.55) : (1 - smoothstep(0, 1, (t - 0.55) / 0.45));
        animState.tabMesh.rotation.x = a.baseRotation.x - 0.58 * k;
        animState.tabMesh.position.z = a.basePosition.z + 0.001 * k;
        if (t >= 1) {
            animState.tabMesh.rotation.copy(a.baseRotation);
            animState.tabMesh.position.copy(a.basePosition);
            animState.tab = null;
        }
    }

    if (animState.twist) {
        const a = animState.twist;
        const t = clamp((now - a.start) / a.duration, 0, 1);
        const k = Math.sin(Math.PI * t);
        if (animState.axis === "x") {
            currentModel.rotation.x = a.baseRotation.x + 0.45 * k;
        } else if (animState.axis === "z") {
            currentModel.rotation.z = a.baseRotation.z + 0.45 * k;
        } else {
            currentModel.rotation.y = a.baseRotation.y + 0.45 * k;
        }
        if (t >= 1) {
            currentModel.rotation.copy(a.baseRotation);
            animState.twist = null;
        }
    }
}

function onViewerClick(event) {
    if (!currentModel) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(currentModel, true);
    if (!hit.length) return;

    if (currentClips.length > 0) {
        playClip(currentClips[0].name);
    } else if (currentModelDef && currentModelDef.fallbackActions.length) {
        const first = currentModelDef.fallbackActions[0];
        if (fallbackHandlers[first]) fallbackHandlers[first]();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (autoRotateEnabled && currentModel) currentModel.rotation.y += 0.0045;
    if (currentMixer) currentMixer.update(1 / 60);
    updateFallbackAnimations(performance.now());
    controls.update();
    renderer.render(scene, camera);
}

function toggleWireframe() {
    wireframeEnabled = !wireframeEnabled;
    if (!currentModel) return;
    currentModel.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
            if (!m) return;
            m.wireframe = wireframeEnabled;
        });
    });
    updateViewerInfo(currentModelDef, currentClips);
}

function toggleLighting() {
    lightingEnabled = !lightingEnabled;
    Object.values(lights).forEach((l) => {
        if (l) l.visible = lightingEnabled;
    });
    updateViewerInfo(currentModelDef, currentClips);
}

function setLightColor(color) {
    const c = new THREE.Color(color);
    lights.key.color = c;
    lights.fill.color = c;
    lights.rim.color = c;
    lights.ambient.color = c;
    lights.hemi.color = c;
}

function resetCamera() {
    if (!currentModelDef) return;
    if (currentMixer) {
        currentMixer.stopAllAction();
    }
    if (currentModel) {
        currentModel.position.copy(animState.basePosition);
        currentModel.scale.copy(animState.baseScale);
        currentModel.rotation.copy(animState.baseRotation);
    }
    if (animState.tabMesh) {
        animState.tabMesh.position.copy(animState.tabBasePosition);
        animState.tabMesh.rotation.copy(animState.tabBaseRotation);
    }
    resetCustomAnim();
    refreshAnchorFromCurrentModel();
    fitCamera(currentModelDef);
}

function toggleAutoRotate() {
    autoRotateEnabled = !autoRotateEnabled;
}

function triggerPrimaryAnimation() {
    if (currentClips.length > 0) {
        playClip(currentClips[0].name);
        return;
    }
    if (currentModelDef && currentModelDef.fallbackActions.length > 0) {
        const key = currentModelDef.fallbackActions[0];
        if (fallbackHandlers[key]) fallbackHandlers[key]();
    }
}

function dumpCameraDebug() {
    if (!camera || !controls || !currentModel) return null;
    refreshAnchorFromCurrentModel();
    const p = animState.anchorCenter.clone().project(camera);
    return {
        model: currentModelDef ? currentModelDef.id : "none",
        camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        anchorCenter: { x: animState.anchorCenter.x, y: animState.anchorCenter.y, z: animState.anchorCenter.z },
        anchorSize: { x: animState.anchorSize.x, y: animState.anchorSize.y, z: animState.anchorSize.z },
        anchorNDC: { x: p.x, y: p.y, z: p.z },
    };
}

window.toggleWireframe = toggleWireframe;
window.toggleLighting = toggleLighting;
window.setLightColor = setLightColor;
window.resetCamera = resetCamera;
window.toggleAutoRotate = toggleAutoRotate;
window.triggerPrimaryAnimation = triggerPrimaryAnimation;
window.toggleGalleryPanel = toggleGalleryPanel;
window.toggleInfoPanel = toggleInfoPanel;
window.dumpCameraDebug = dumpCameraDebug;

function init() {
    buildGallery();
    setupTabs();
    setupScene();
    renderDynamicActions();
    animate();
    if (window.innerWidth > 980) {
        document.getElementById("infoPanel").classList.add("collapsed");
    }
    loadModel("coca_cola_bottle");
}

init();


