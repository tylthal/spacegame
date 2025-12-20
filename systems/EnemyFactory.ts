import * as THREE from 'three';
import { EnemyType } from '../types';
import { AssetManager } from './AssetManager';

export class EnemyFactory {
    private static pool: Record<string, THREE.Group[]> = {};

    static getMesh(type: EnemyType, assets: AssetManager): THREE.Group {
        if (!this.pool[type]) this.pool[type] = [];
        const mesh = this.pool[type].pop();
        
        if (mesh) {
            // Reset transforms and state
            mesh.position.set(0,0,0);
            mesh.rotation.set(0,0,0);
            mesh.scale.set(1,1,1);
            
            // Reset Health Bar
            const bar = mesh.getObjectByName('health_bar');
            if (bar) {
                bar.visible = false;
                const fg = bar.getObjectByName('health_fg') as THREE.Mesh;
                if(fg) fg.scale.x = 23;
            }
            return mesh;
        }

        return this.createMesh(type, assets);
    }

    static releaseMesh(mesh: THREE.Group, type: EnemyType) {
        if (!this.pool[type]) this.pool[type] = [];
        this.pool[type].push(mesh);
    }

    static createMesh(type: EnemyType, assets: AssetManager): THREE.Group {
        const group = new THREE.Group();
        const { geos, mats } = assets.assets;

        switch(type) {
            case 'DREADNOUGHT': {
                // BRONZE / ORANGE THEME
                const hull = new THREE.Mesh(geos.blockHull, mats.metalBronze);
                group.add(hull);
                const lEng = new THREE.Mesh(geos.engineBlock, mats.chrome); // Contrast
                lEng.position.set(-15, 0, 20); group.add(lEng);
                const rEng = lEng.clone(); rEng.position.set(15, 0, 20); group.add(rEng);
                const glowGeo = new THREE.CircleGeometry(4, 8);
                const lGlow = new THREE.Mesh(glowGeo, mats.redGlow);
                lGlow.position.set(0, -6, 0); lGlow.rotateX(Math.PI/2); lEng.add(lGlow);
                const rGlow = lGlow.clone(); rEng.add(rGlow);
                const bridge = new THREE.Mesh(geos.bridge, mats.chrome);
                bridge.position.set(0, 8, 10); group.add(bridge);
                break;
            }
            case 'WRAITH': {
                // PURPLE THEME
                const core = new THREE.Mesh(geos.crystal, mats.purpleGlow);
                group.add(core);
                const cage = new THREE.Mesh(geos.cage, mats.metalPurple);
                cage.scale.setScalar(1.4);
                cage.name = 'rotator'; 
                group.add(cage);
                break;
            }
            case 'INTERCEPTOR': {
                // RED THEME
                const pod = new THREE.Mesh(geos.pod, mats.metalRed);
                group.add(pod);
                const glass = new THREE.Mesh(new THREE.SphereGeometry(2.5), mats.glassRed);
                glass.position.set(0, 1, 3);
                pod.add(glass);
                const lWing = new THREE.Mesh(geos.hexPanel, mats.chrome); // Contrast with Silver wings
                lWing.rotateZ(Math.PI / 2); lWing.position.set(-10, 0, 0); lWing.scale.set(1, 1, 0.2);
                group.add(lWing);
                const rWing = lWing.clone(); rWing.position.set(10, 0, 0);
                group.add(rWing);
                const strutGeo = new THREE.CylinderGeometry(0.5, 0.5, 20);
                const strut = new THREE.Mesh(strutGeo, mats.detailDark);
                strut.rotateZ(Math.PI/2);
                group.add(strut);
                break;
            }
            case 'SCOUT': {
                // GOLD THEME
                const fuse = new THREE.Mesh(geos.fuselage, mats.metalGold);
                group.add(fuse);
                const wings = new THREE.Mesh(geos.wingBox, mats.chrome); // Silver wings
                wings.position.set(0, 0, 5);
                wings.scale.set(1.5, 0.2, 0.8);
                const wingGroup = new THREE.Group();
                wingGroup.add(wings);
                group.add(wingGroup);
                const glow = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 8), mats.engineGlow);
                glow.rotateX(-Math.PI/2); glow.position.set(0, 0, 14);
                group.add(glow);
                break;
            }
            case 'ELITE': {
                // BLUE THEME
                const base = new THREE.Mesh(geos.saucerDisk, mats.metalBlue);
                group.add(base);
                const top = new THREE.Mesh(geos.saucerDisk, mats.chrome);
                top.position.y = 2; top.scale.setScalar(0.7);
                group.add(top);
                const dome = new THREE.Mesh(geos.saucerDome, mats.glassRed);
                dome.position.y = 3; dome.scale.setScalar(0.8);
                group.add(dome);
                for(let i=0; i<6; i++) {
                    const s = new THREE.Mesh(geos.spike, mats.detailDark);
                    const angle = (i/6) * Math.PI * 2;
                    s.position.set(Math.cos(angle)*11, 0, Math.sin(angle)*11);
                    s.rotateZ(-Math.PI/2); s.lookAt(0,0,0); s.rotateX(Math.PI);
                    group.add(s);
                }
                break;
            }
            default: // STANDARD
                // CHROME THEME
                const saucer = new THREE.Mesh(geos.saucerDisk, mats.chrome);
                group.add(saucer);
                const stdDome = new THREE.Mesh(geos.saucerDome, mats.glassBlue);
                stdDome.position.y = 1.5;
                group.add(stdDome);
                const rim = new THREE.Mesh(geos.ring, mats.detailDark); // Contrast
                rim.rotation.x = Math.PI/2;
                rim.name = 'rotator';
                group.add(rim);
        }

        // Pre-create Health Bar (Hidden)
        // This avoids creating geometry/materials during the first damage frame
        const bar = new THREE.Group(); 
        bar.name = 'health_bar'; 
        bar.position.y = 25; // Default approx height, adjusted in logic if needed
        bar.visible = false;
        
        const bg = new THREE.Mesh(assets.assets.geos.hpBg, assets.assets.mats.hpBg);
        const fg = new THREE.Mesh(assets.assets.geos.hpFg, assets.assets.mats.hpFgFull);
        fg.name = 'health_fg'; 
        fg.scale.set(23, 2, 1); 
        fg.position.set(-11.5, 0, 0.1);
        
        bar.add(bg, fg); 
        group.add(bar);

        return group;
    }
}