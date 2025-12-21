import * as THREE from 'three';

export interface GameAssets {
    geos: { [key: string]: THREE.BufferGeometry };
    mats: { [key: string]: THREE.Material };
}

export class AssetManager {
    public assets: GameAssets;
    private menuTargetGeos: Map<number, { shell: THREE.BufferGeometry; core: THREE.BufferGeometry }> = new Map();
    private menuTargetMats: Map<number, THREE.Material> = new Map();
    private menuTargetPool: Map<string, THREE.Group[]> = new Map();
    private starfieldGeometry: THREE.BufferGeometry;
    private starfieldMaterial: THREE.PointsMaterial;

    constructor() {
        this.assets = this.createAssets();
        const { geometry, material } = this.createStarfieldAssets();
        this.starfieldGeometry = geometry;
        this.starfieldMaterial = material;
    }

    private createAssets(): GameAssets {
        const geos: { [key: string]: THREE.BufferGeometry } = {
            bullet: new THREE.CylinderGeometry(0.8, 0.8, 20, 6),
            missile: new THREE.CapsuleGeometry(2.5, 12, 4, 8),
            hpBg: new THREE.PlaneGeometry(24, 3),
            hpFg: new THREE.PlaneGeometry(1, 1),
            saucerDisk: new THREE.CylinderGeometry(10, 12, 3, 16),
            saucerDome: new THREE.SphereGeometry(6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            ring: new THREE.TorusGeometry(12, 1.5, 8, 24),
            fuselage: new THREE.ConeGeometry(4, 25, 8),
            wingBox: new THREE.BoxGeometry(10, 2, 8),
            hexPanel: new THREE.CylinderGeometry(8, 8, 2, 6),
            pod: new THREE.SphereGeometry(5, 12, 12),
            crystal: new THREE.OctahedronGeometry(10, 0),
            cage: new THREE.IcosahedronGeometry(14, 0),
            blockHull: new THREE.BoxGeometry(20, 10, 45),
            engineBlock: new THREE.CylinderGeometry(4, 5, 10, 8),
            bridge: new THREE.BoxGeometry(8, 6, 12),
            spike: new THREE.ConeGeometry(1, 8, 4),
            interceptorStrut: new THREE.CylinderGeometry(0.5, 0.5, 20),
            dreadnoughtGlow: new THREE.CircleGeometry(4, 8),
            interceptorGlass: new THREE.SphereGeometry(2.5),
            scoutEngineCone: new THREE.ConeGeometry(2, 5, 8),
        };

        // Shared Material Settings for consistency
        const metalShininess = 80;
        const metalSpecular = 0xffffff;

        const mats: { [key: string]: THREE.Material } = {
            bullet: new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 6.0, shininess: 100, flatShading: true }),
            missile: new THREE.MeshPhongMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 4.0, shininess: 60 }),
            
            // NEW BRIGHT METALS
            // Chrome (Standard)
            chrome: new THREE.MeshPhongMaterial({ 
                color: 0xffffff, specular: metalSpecular, shininess: 100, 
                emissive: 0x222222, emissiveIntensity: 0.3 
            }),
            // Gold (Scout)
            metalGold: new THREE.MeshPhongMaterial({ 
                color: 0xffd700, specular: 0xffffee, shininess: metalShininess, 
                emissive: 0xaa6600, emissiveIntensity: 0.3 
            }),
            // Red (Interceptor)
            metalRed: new THREE.MeshPhongMaterial({ 
                color: 0xff0000, specular: 0xffaaaa, shininess: metalShininess, 
                emissive: 0x550000, emissiveIntensity: 0.4 
            }),
            // Blue (Elite)
            metalBlue: new THREE.MeshPhongMaterial({ 
                color: 0x0088ff, specular: 0x00ffff, shininess: metalShininess, 
                emissive: 0x002255, emissiveIntensity: 0.4 
            }),
            // Purple (Wraith)
            metalPurple: new THREE.MeshPhongMaterial({ 
                color: 0x9900ff, specular: 0xff00ff, shininess: metalShininess, 
                emissive: 0x330066, emissiveIntensity: 0.4 
            }),
            // Bronze (Dreadnought)
            metalBronze: new THREE.MeshPhongMaterial({ 
                color: 0xcd7f32, specular: 0xffccaa, shininess: 60, 
                emissive: 0x663300, emissiveIntensity: 0.3 
            }),
            // Dark details (for contrast)
            detailDark: new THREE.MeshPhongMaterial({ 
                color: 0x222222, specular: 0x111111, shininess: 30 
            }),

            engineGlow: new THREE.MeshBasicMaterial({ color: 0x00ffff }),
            redGlow: new THREE.MeshBasicMaterial({ color: 0xff4444 }),
            purpleGlow: new THREE.MeshPhongMaterial({ color: 0xaa44ff, emissive: 0x8800ff, emissiveIntensity: 4.0, transparent: true, opacity: 0.9 }),
            wireframe: new THREE.MeshBasicMaterial({ color: 0xcc44ff, wireframe: true, transparent: true, opacity: 0.6 }),
            glassBlue: new THREE.MeshPhongMaterial({ color: 0x44ffff, transparent: true, opacity: 0.8, shininess: 90, emissive: 0x0088ff, emissiveIntensity: 0.8 }),
            glassRed: new THREE.MeshPhongMaterial({ color: 0xff4444, transparent: true, opacity: 0.8, shininess: 90, emissive: 0xff0000, emissiveIntensity: 0.8 }),
            hpBg: new THREE.MeshBasicMaterial({ color: 0x330000, depthTest: false, transparent: true }),
            // Shared Health Bar Colors
            hpFgFull: new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, transparent: true }),
            hpFgWarning: new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true }),
            hpFgCritical: new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true }),
        };

        geos.bullet.rotateX(Math.PI / 2);
        geos.missile.rotateX(Math.PI / 2);
        geos.fuselage.rotateX(Math.PI / 2);
        geos.engineBlock.rotateX(Math.PI / 2);
        geos.hexPanel.rotateX(Math.PI / 2);
        geos.hpFg.translate(0.5, 0, 0);

        return { geos, mats };
    }

    private createStarfieldAssets() {
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(15000 * 3);
        for (let i = 0; i < 15000; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const r = 5000 + Math.random() * 5000;
            starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            starPos[i * 3 + 2] = r * Math.cos(phi);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0x888888, size: 1.5, transparent: true, opacity: 0.5, fog: false });
        return { geometry: starGeo, material: starMat };
    }

    private getMenuTargetGeometries(size: number) {
        const cached = this.menuTargetGeos.get(size);
        if (cached) return cached;

        const shell = new THREE.IcosahedronGeometry(size, 1);
        const core = new THREE.SphereGeometry(size * 0.4, 16, 16);
        this.menuTargetGeos.set(size, { shell, core });
        return { shell, core };
    }

    private getMenuTargetMaterial(color: number) {
        let mat = this.menuTargetMats.get(color);
        if (!mat) {
            mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 2.5, wireframe: true });
            this.menuTargetMats.set(color, mat);
        }
        return mat;
    }

    public acquireMenuTarget(size: number, color: number) {
        const key = `${size}:${color}`;
        const pool = this.menuTargetPool.get(key) ?? [];
        const existing = pool.pop();
        if (existing) return existing;

        const group = new THREE.Group();
        const { shell, core } = this.getMenuTargetGeometries(size);
        const targetMat = this.getMenuTargetMaterial(color);
        const coreMat = this.menuTargetMats.get(0xffffff) ?? new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.menuTargetMats.set(0xffffff, coreMat);

        group.add(new THREE.Mesh(shell, targetMat));
        group.add(new THREE.Mesh(core, coreMat));
        group.matrixAutoUpdate = false;
        group.updateMatrix();
        this.menuTargetPool.set(key, pool);
        return group;
    }

    public releaseMenuTarget(group: THREE.Group, size: number, color: number) {
        const key = `${size}:${color}`;
        const pool = this.menuTargetPool.get(key) ?? [];
        group.position.set(0, 0, 0);
        group.rotation.set(0, 0, 0);
        group.visible = true;
        group.updateMatrix();
        pool.push(group);
        this.menuTargetPool.set(key, pool);
    }

    public createStarfieldInstance() {
        const starfield = new THREE.Points(this.starfieldGeometry, this.starfieldMaterial);
        starfield.matrixAutoUpdate = false;
        starfield.updateMatrix();
        return starfield;
    }

    public releaseStarfieldInstance(starfield: THREE.Points) {
        starfield.visible = false;
    }

    public resetPools() {
        this.menuTargetPool.clear();
    }

    public dispose() {
        Object.values(this.assets.geos).forEach(g => g.dispose());
        Object.values(this.assets.mats).forEach(m => m.dispose());
        this.menuTargetGeos.forEach(({ shell, core }) => { shell.dispose(); core.dispose(); });
        this.menuTargetMats.forEach(m => m.dispose());
        this.menuTargetPool.clear();
        this.starfieldGeometry.dispose();
        this.starfieldMaterial.dispose();
    }
}