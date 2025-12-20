import * as THREE from 'three';
import { SCENE_CONFIG } from '../config/constants';

// Shared objects to avoid GC
const _tempColor = new THREE.Color();

export class ParticleSystem {
    public mesh: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private positions: Float32Array;
    private velocities: Float32Array;
    private ages: Float32Array;
    private decays: Float32Array;
    private colors: Float32Array;
    
    private head: number = 0;
    private tail: number = 0;
    private count: number = 0;
    private maxParticles: number;

    constructor(scene: THREE.Scene) {
        this.maxParticles = SCENE_CONFIG.MAX_PARTICLES;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3).fill(99999);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.ages = new Float32Array(this.maxParticles);
        this.decays = new Float32Array(this.maxParticles);
        this.colors = new Float32Array(this.maxParticles * 3);

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        const material = new THREE.PointsMaterial({
            size: 2.5,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.mesh = new THREE.Points(this.geometry, material);
        this.mesh.frustumCulled = false;
        scene.add(this.mesh);
    }

    public update(timeScale: number) {
        if (this.count === 0) return;

        const posAttr = this.geometry.attributes.position;
        const colAttr = this.geometry.attributes.color;
        let updateNeeded = false;

        let currentIndex = this.tail;
        for (let i = 0; i < this.count; i++) {
            const i3 = currentIndex * 3;
            
            this.positions[i3] += this.velocities[i3] * timeScale;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * timeScale;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * timeScale;
            this.ages[currentIndex] -= this.decays[currentIndex] * timeScale;
            
            currentIndex++;
            if (currentIndex >= this.maxParticles) currentIndex = 0;
            updateNeeded = true;
        }

        while (this.count > 0) {
            if (this.ages[this.tail] <= 0) {
                const i3 = this.tail * 3;
                this.positions[i3] = 99999;
                this.tail = (this.tail + 1) % this.maxParticles;
                this.count--;
                updateNeeded = true;
            } else break;
        }

        if (updateNeeded) {
            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
        }
    }

    public spawnImpact(pos: THREE.Vector3, colorHex: number, count: number = 80, spread: number = 10, decay: number = 0.025) {
        _tempColor.setHex(colorHex);
        const r = _tempColor.r, g = _tempColor.g, b = _tempColor.b;
        
        for(let i=0; i<count; i++) {
            const id = this.head;
            const i3 = id * 3;
            this.positions[i3] = pos.x; 
            this.positions[i3+1] = pos.y; 
            this.positions[i3+2] = pos.z;
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = Math.random() * spread;
            
            this.velocities[i3] = speed * Math.sin(phi) * Math.cos(theta);
            this.velocities[i3+1] = speed * Math.sin(phi) * Math.sin(theta);
            this.velocities[i3+2] = speed * Math.cos(phi);

            this.colors[i3] = r; 
            this.colors[i3+1] = g; 
            this.colors[i3+2] = b;
            
            this.ages[id] = 1.0; 
            this.decays[id] = decay; 
            
            this.head = (this.head + 1) % this.maxParticles;
            if (this.count < this.maxParticles) this.count++;
            else this.tail = (this.tail + 1) % this.maxParticles;
        }
    }

    public spawnShockwave(pos: THREE.Vector3, radius: number) {
        const count = 120;
        _tempColor.setHex(0xffaa00);
        const r = _tempColor.r, g = _tempColor.g, b = _tempColor.b;
        
        for(let i=0; i<count; i++) {
            const id = this.head;
            const i3 = id * 3;
            this.positions[i3] = pos.x; 
            this.positions[i3+1] = pos.y; 
            this.positions[i3+2] = pos.z;
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = radius * 0.15 * (0.8 + Math.random() * 0.4);
            
            this.velocities[i3] = speed * Math.sin(phi) * Math.cos(theta);
            this.velocities[i3+1] = speed * Math.sin(phi) * Math.sin(theta);
            this.velocities[i3+2] = speed * Math.cos(phi);

            this.colors[i3] = r; 
            this.colors[i3+1] = g; 
            this.colors[i3+2] = b;
            
            this.ages[id] = 1.0; 
            this.decays[id] = 0.04; 
            
            this.head = (this.head + 1) % this.maxParticles;
            if (this.count < this.maxParticles) this.count++;
            else this.tail = (this.tail + 1) % this.maxParticles;
        }
    }

    public dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.mesh) {
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    (this.mesh.material as THREE.Material).dispose();
                }
            }
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
        }
    }
}