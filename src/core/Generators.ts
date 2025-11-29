import * as THREE from 'three';

export const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export type GeneratorFunc = (particleCount: number) => number[];

function generateAttractor(odeFunc: (x: number, y: number, z: number) => { x: number, y: number, z: number }, scale: number, particleCount: number, dt: number, initialState?: { x: number, y: number, z: number }) {
    const arr: number[] = [];
    let x = initialState?.x ?? 0.1, y = initialState?.y ?? 0.1, z = initialState?.z ?? 0.1;
    for (let i = 0; i < 100; i++) { const d = odeFunc(x, y, z); x += d.x * dt; y += d.y * dt; z += d.z * dt; }
    for (let i = 0; i < particleCount; i++) {
        const d = odeFunc(x, y, z); x += d.x * dt; y += d.y * dt; z += d.z * dt;
        const noise = 0.5;
        arr.push(x * scale + (Math.random() - 0.5) * noise, y * scale + (Math.random() - 0.5) * noise, z * scale + (Math.random() - 0.5) * noise);
    }
    return arr;
}

function generateStiffAttractor(odeFunc: (x: number, y: number, z: number) => { x: number, y: number, z: number }, scale: number, particleCount: number, dt: number, microSteps = 1) {
    const arr: number[] = [];
    let x = 0.1, y = 0.1, z = 0.1;
    for (let i = 0; i < 100 * microSteps; i++) {
        const d = odeFunc(x, y, z);
        x += d.x * dt; y += d.y * dt; z += d.z * dt;
    }
    for (let i = 0; i < particleCount; i++) {
        for (let j = 0; j < microSteps; j++) {
            const d = odeFunc(x, y, z);
            x += d.x * dt; y += d.y * dt; z += d.z * dt;
        }
        if (isNaN(x) || Math.abs(x) > 1000) { x = 0.1; y = 0.1; z = 0.1; }
        const noise = 0.5;
        arr.push(x * scale + (Math.random() - 0.5) * noise, y * scale + (Math.random() - 0.5) * noise, z * scale + (Math.random() - 0.5) * noise);
    }
    return arr;
}

export const Generators = {
    getLorenz: (count: number) => { const sigma = 10, rho = 28, beta = 8 / 3; return generateAttractor((x, y, z) => ({ x: sigma * (y - x), y: x * (rho - z) - y, z: x * y - beta * z }), 15, count, 0.005); },
    getAizawa: (count: number) => { const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1; return generateAttractor((x, y, z) => ({ x: (z - b) * x - d * y, y: d * x + (z - b) * y, z: c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x }), 150, count, 0.01); },
    getDadras: (count: number) => { const p = 3, q = 2.7, r = 1.7, s = 2, e = 9; return generateAttractor((x, y, z) => ({ x: y - p * x + q * y * z, y: r * y - x * z + z, z: s * x * y - e * z }), 40, count, 0.005); },
    getRossler: (count: number) => {
        const a = 0.2, b = 0.2, c = 5.7;
        return generateAttractor((x, y, z) => ({
            x: -y - z,
            y: x + a * y,
            z: b + z * (x - c)
        }), 20, count, 0.025);
    },
    getChen: (count: number) => {
        const a = 35, b = 3, c = 28;
        return generateStiffAttractor((x, y, z) => ({
            x: a * (y - x),
            y: (c - a) * x - x * z + c * y,
            z: x * y - b * z
        }), 15, count, 0.002, 2);
    },
    getTsucs2: (count: number) => {
        const a = 40, b = 1.833, c = 0.833, d = 0.16, e = 0.65, f = 20;
        return generateAttractor(
            (x, y, z) => ({
                x: a * (y - x) + d * x * z,
                y: b * x - x * z + f * y,
                z: -e * x * x + x * y + c * z
            }),
            1,
            count,
            0.000218,
            { x: 2.1, y: -1.3, z: 0.7 }
        );
    },
    getMultiChua: (count: number) => {
        // Sine-Chua for multi-scroll
        const a = 9, b = 14.286, c = 1.3; // Tuned constants
        return generateAttractor((x, y, z) => ({
            x: a * (y - x + c * Math.sin(x)),
            y: x - y + z,
            z: -b * y
        }), 200, count, 0.004, { x: 0.2, y: 0.1, z: 0.05 });
    },
    getHalvorsen: (count: number) => {
        const a = 1.4;
        return generateAttractor((x, y, z) => ({
            x: -a * x - 4 * y - 4 * z - y * y,
            y: -a * y - 4 * z - 4 * x - z * z,
            z: -a * z - 4 * x - 4 * y - x * x
        }), 30, count, 0.001, { x: 1, y: 0, z: 2 });
    },
    getThomas: (count: number) => {
        const b = 0.208186;

        return generateAttractor(
            (x, y, z) => ({
                x: Math.sin(y) - b * x,
                y: Math.sin(z) - b * y,
                z: Math.sin(x) - b * z
            }),
            150,            // ★ Increase warm-up (critical)
            count,
            0.06,          // ★ Smaller dt ensures smooth convergence
            { x: 1, y: -1, z: 0.5 }   // ★ Best-known working initial conditions
        );
    },
    getSprott: (count: number) => {
        return generateAttractor((x, y, z) => ({
            x: y,
            y: -x + y * z,
            z: 1 - y * y
        }), 100, count, 0.02);
    },
    getFourWing: (count: number) => {
        const a = 0.2, b = 0.01, c = -0.4;
        return generateAttractor((x, y, z) => ({
            x: a * x + y * z,
            y: b * x + c * y - x * z,
            z: -z - x * y
        }), 150, count, 0.05);
    },
    getMenger: (count: number) => {
        const arr: number[] = [];
        const size = 600;
        let c = 0;
        const maxAttempts = count * 50;
        let attempts = 0;
        while (c < count && attempts < maxAttempts) {
            attempts++;
            const x = (Math.random() - 0.5) * size;
            const y = (Math.random() - 0.5) * size;
            const z = (Math.random() - 0.5) * size;
            let isHole = false;
            let cx = x + size / 2;
            let cy = y + size / 2;
            let cz = z + size / 2;
            let s = size;
            for (let i = 0; i < 4; i++) {
                s /= 3;
                const dx = Math.floor(cx / s) % 3;
                const dy = Math.floor(cy / s) % 3;
                const dz = Math.floor(cz / s) % 3;
                const ones = (dx === 1 ? 1 : 0) + (dy === 1 ? 1 : 0) + (dz === 1 ? 1 : 0);
                if (ones >= 2) { isHole = true; break; }
            }
            if (!isHole) { arr.push(x, y, z); c++; }
        }
        return arr;
    },
    getJulia: (count: number) => {
        const arr: number[] = [];
        const c = { w: -0.2, x: 0.6, y: 0.2, z: 0.2 };
        const maxIter = 8;
        const bound = 1.5;
        const scale = 300;
        let i = 0;
        while (i < count) {
            let x = (Math.random() * 2 - 1) * bound;
            let y = (Math.random() * 2 - 1) * bound;
            let z = (Math.random() * 2 - 1) * bound;
            let w = (Math.random() * 2 - 1) * bound;
            let escaped = false;
            let j = 0;
            let qx = x, qy = y, qz = z, qw = w;
            for (j = 0; j < maxIter; j++) {
                let nw = qw * qw - qx * qx - qy * qy - qz * qz + c.w;
                let nx = 2 * qw * qx + c.x;
                let ny = 2 * qw * qy + c.y;
                let nz = 2 * qw * qz + c.z;
                qw = nw; qx = nx; qy = ny; qz = nz;
                if (qw * qw + qx * qx + qy * qy + qz * qz > 4) { escaped = true; break; }
            }
            if (!escaped) { arr.push(x * scale, y * scale, z * scale); i++; }
        }
        return arr;
    },
    getClifford: (count: number) => {
        const arr: number[] = [];
        const scale = 300;
        for (let i = 0; i < count; i++) {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI * 2;
            const p1 = Math.cos(u);
            const p2 = Math.sin(u);
            const p3 = Math.cos(v);
            const p4 = Math.sin(v);
            const x = p1 / (1 - p4 * 0.5);
            const y = p2 / (1 - p4 * 0.5);
            const z = p3 / (1 - p4 * 0.5);
            arr.push(x * scale, y * scale, z * scale);
        }
        return arr;
    },
    getSierpinski: (count: number) => {
        const arr: number[] = []; const corners = [{ x: 400, y: -300, z: 400 }, { x: -400, y: -300, z: 400 }, { x: 0, y: -300, z: -400 }, { x: 0, y: 400, z: 0 }];
        let cx = 0, cy = 0, cz = 0;
        for (let i = 0; i < count; i++) {
            const t = corners[Math.floor(Math.random() * 4)]; cx = (cx + t.x) / 2; cy = (cy + t.y) / 2; cz = (cz + t.z) / 2;
            arr.push(cx + (Math.random() - 0.5) * 5, cy + (Math.random() - 0.5) * 5, cz + (Math.random() - 0.5) * 5);
        }
        return arr;
    },
    getMandelbulb: (count: number) => {
        const arr: number[] = []; for (let i = 0; i < count; i++) {
            const t = Math.random() * Math.PI * 2; const p = Math.acos(2 * Math.random() - 1); const r = 400 * Math.pow(Math.random(), 1 / 3);
            const s = 1 + 0.5 * Math.sin(t * 8) * Math.cos(p * 8);
            arr.push(r * Math.sin(p) * Math.cos(t) * s, r * Math.sin(p) * Math.sin(t) * s, r * Math.cos(p) * s);
        }
        return arr;
    },
    getUniverse: (count: number) => {
        const arr: number[] = [];
        const arms = 3;
        const coreRadius = 100;
        const maxRadius = 800;

        for (let i = 0; i < count; i++) {
            // Core concentration
            if (Math.random() < 0.2) {
                const r = Math.random() * coreRadius;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                arr.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) * 0.5);
                continue;
            }

            // Spiral Arms
            const arm = Math.floor(Math.random() * arms);
            const r = coreRadius + Math.random() * (maxRadius - coreRadius);
            const theta = (r / maxRadius) * 5 * Math.PI + (arm / arms) * Math.PI * 2;

            // Add spread/noise to arms
            const spread = (r / maxRadius) * 200;
            const x = r * Math.cos(theta) + (Math.random() - 0.5) * spread;
            const z = r * Math.sin(theta) + (Math.random() - 0.5) * spread;
            const y = (Math.random() - 0.5) * spread * 0.5; // Flattened galaxy

            arr.push(x, y, z);
        }
        return arr;
    },
    getHeart: (count: number) => { const arr: number[] = []; for (let i = 0; i < count; i++) { const t = Math.random() * Math.PI * 2; let x = 16 * Math.pow(Math.sin(t), 3); let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); let z = (Math.random() - 0.5) * 10; const s = 25; const r = s * (Math.random() * 0.2 + 0.8); arr.push(x * r, y * r, z * s * 4 * Math.random()); } return arr; },
    getPenrose: (count: number) => {
        const arr: number[] = [];
        const s = 500;
        const edges = [
            [[-s, -s, -s], [s, -s, -s]], [[s, -s, -s], [s, s, -s]], [[s, s, -s], [-s, s, -s]], [[-s, s, -s], [-s, -s, -s]],
            [[-s, -s, s], [s, -s, s]], [[s, -s, s], [s, s, s]], [[s, s, s], [-s, s, s]], [[-s, s, s], [-s, -s, s]],
            [[-s, -s, -s], [-s, -s, s]], [[s, -s, -s], [s, -s, s]], [[s, s, -s], [s, s, s]], [[-s, s, -s], [-s, s, s]]
        ];
        const p = Math.floor(count / edges.length);
        edges.forEach(e => {
            const [S, E] = e;
            for (let i = 0; i < p; i++) {
                const t = Math.random();
                const j = 20;
                arr.push(
                    S[0] + (E[0] - S[0]) * t + (Math.random() - 0.5) * j,
                    S[1] + (E[1] - S[1]) * t + (Math.random() - 0.5) * j,
                    S[2] + (E[2] - S[2]) * t + (Math.random() - 0.5) * j
                );
            }
        });
        return arr;
    },
    getTornado: (count: number) => {
        const arr: number[] = [];
        const h = rand(800, 1200);
        const top = rand(2, 5);
        for (let i = 0; i < count; i++) {
            const y = (i / count) * h - h / 2;
            const t = (y + h / 2) / h;
            const r = 20 + t * 400 * top;
            const a = y * 0.1;
            const n = (Math.random() - 0.5) * 50 * t;
            arr.push(Math.cos(a) * r + n, y + (Math.random() - 0.5) * 20, Math.sin(a) * r + n);
        }
        return arr;
    },

    getHopalong: (count: number) => {
        const arr: number[] = [];
        const a = 2.0, b = 1.0, c = 0.0;
        let x = 0, y = 0;
        const scale = 150;
        for (let i = 0; i < count; i++) {
            const xx = y - Math.sign(x) * Math.sqrt(Math.abs(b * x - c));
            y = a - x;
            x = xx;
            arr.push(x * scale, y * scale, (Math.random() - 0.5) * 10); // 2D attractor, adding Z noise
        }
        return arr;
    },
    getRose: (count: number) => {
        const arr: number[] = [];
        for (let i = 0; i < count; i++) {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI;
            const r = 300 * (1 + 0.3 * Math.cos(5 * u)) * Math.sin(v);
            const h = 400 * Math.pow(v / Math.PI, 2) - 200;
            const rad = r * (0.5 + 0.5 * Math.pow(v / Math.PI, 0.5));
            const x = rad * Math.cos(u);
            const y = h + Math.sin(10 * u) * 30;
            const z = rad * Math.sin(u);
            arr.push(x, y, z);
        }
        return arr;
    },
    getButterfly: (count: number) => {
        const arr: number[] = [];
        const scale = 80;
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 12 * Math.PI;
            const e = Math.exp(Math.cos(t));
            const c = 2 * Math.cos(4 * t);
            const s = Math.pow(Math.sin(t / 12), 5);
            const r = scale * (e - c + s);
            const x = r * Math.sin(t);
            const y = r * Math.cos(t);
            const z = Math.abs(x) * 0.5 + (Math.random() - 0.5) * 20;
            arr.push(x, y, z);
        }
        return arr;
    },
    getJellyfish: (count: number) => {
        const arr: number[] = [];
        for (let i = 0; i < count; i++) {
            if (i < count * 0.3) {
                const u = Math.random() * Math.PI * 2;
                const v = Math.random() * Math.PI / 2;
                const r = 250;
                const dr = (Math.random() - 0.5) * 10;
                arr.push((r + dr) * Math.sin(v) * Math.cos(u), (r + dr) * Math.cos(v) + 150, (r + dr) * Math.sin(v) * Math.sin(u));
            } else {
                const numTentacles = 12;
                const tentacleId = i % numTentacles;
                const angle = (tentacleId / numTentacles) * Math.PI * 2;
                const h = Math.random() * 600;
                const rBase = 150 * Math.random();
                const xBase = Math.cos(angle) * rBase;
                const zBase = Math.sin(angle) * rBase;
                const y = 150 - h;
                const flow = Math.sin(h * 0.02 + angle) * 40;
                arr.push(xBase + flow, y, zBase + flow);
            }
        }
        return arr;
    },
    getNautilus: (count: number) => {
        const arr: number[] = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 6;
            const tubeAngle = Math.random() * Math.PI * 2;
            const R = 20 * Math.exp(0.3 * angle);
            const r = 10 * Math.exp(0.3 * angle);
            const cx = R * Math.cos(angle);
            const cy = R * Math.sin(angle);
            const x = cx + r * Math.cos(tubeAngle) * Math.cos(angle);
            const y = cy + r * Math.cos(tubeAngle) * Math.sin(angle);
            const z = r * Math.sin(tubeAngle);
            arr.push(x, y, z);
        }
        return arr;
    },
    getGalaxy: (count: number) => {
        const arr: number[] = [];
        const size = 1200;
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * size * 2;
            const z = (Math.random() - 0.5) * size * 2;
            // Initial wave shape
            const y = Math.sin(x * 0.01) * 20 + Math.cos(z * 0.01) * 20;
            arr.push(x, y, z);
        }
        return arr;
    }
};

export function getColors(count: number) {
    const arr: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
        c.setHSL(Math.random(), 0.8, 0.6);
        arr.push(c.r, c.g, c.b);
    }
    return arr;
}
