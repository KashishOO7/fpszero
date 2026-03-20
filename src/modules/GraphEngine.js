import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class GraphEngine {
    constructor(scene, camera, config, onNodeSelect) {
        this.scene = scene;
        this.camera = camera;
        this.config = config;
        this.onNodeSelect = onNodeSelect;
        this.group = new THREE.Group();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.pulsars = [];
        
        this.disposables = {
            geometries: [],
            materials: [],
            textures: [],
            cssElements: []
        };

        this._clickHandler = (e) => this.handleInput(e.clientX, e.clientY);
        this._touchHandler = (e) => {
            if(e.touches.length > 0) {
                const t = e.touches[0];
                this.handleInput(t.clientX, t.clientY);
            }
        };
        
        this.createGraph();
        this.addEventListeners();
    }

    createGraph() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        
        this.glowTexture = new THREE.CanvasTexture(canvas);
        this.disposables.textures.push(this.glowTexture);

        const keys = Object.keys(this.config.projectsData);
        const nodes = [];
        const radius = 30;

        keys.forEach((key, i) => {
            const data = this.config.projectsData[key];
            const phi = Math.acos(-1 + (2 * i) / keys.length);
            const theta = Math.sqrt(keys.length * Math.PI) * phi;
            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);

            const node = this.createNode(x, y, z, data.color || 0xffffff, key, this.glowTexture);
            node.userData = { ...data, name: key };
            
            if (data.isPulsar) {
                this.pulsars.push(node);
            }

            nodes.push(node);
            this.group.add(node);
        });

        this.lineMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.2 });
        this.disposables.materials.push(this.lineMat);
        
        for(let i=0; i<nodes.length; i++) {
            for(let j=i+1; j<nodes.length; j++) {
                const dist = nodes[i].position.distanceTo(nodes[j].position);
                if (dist < 40) {
                    const geo = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
                    this.disposables.geometries.push(geo);
                    this.group.add(new THREE.Line(geo, this.lineMat));
                }
            }
        }

        this.scene.add(this.group);
    }

    createNode(x, y, z, color, labelText, texture) {
        const geo = new THREE.SphereGeometry(1.0, 16, 16);
        this.disposables.geometries.push(geo);

        const mat = new THREE.MeshBasicMaterial({ color: color });
        this.disposables.materials.push(mat);
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);

        const spriteMat = new THREE.SpriteMaterial({
            map: texture, color: color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
        });
        this.disposables.materials.push(spriteMat);
        
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(8, 8, 1);
        mesh.add(sprite);

        const div = document.createElement('div');
        div.className = 'skill-label graph-label';
        div.textContent = labelText;
        const label = new CSS2DObject(div);
        label.position.set(0, 2.5, 0); 
        this.disposables.cssElements.push(div);
        
        const trigger = (e) => { e.stopPropagation(); this.onNodeSelect(mesh); };
        div.addEventListener('click', trigger);
        div.addEventListener('touchstart', trigger, {passive: false});
        
        mesh.add(label);
        return mesh;
    }

    addEventListeners() {
        window.addEventListener('click', this._clickHandler);
        window.addEventListener('touchstart', this._touchHandler, { passive: false });
    }

    handleInput(x, y) {
        this.mouse.x = (x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(y / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.group.children, true);
        const nodeHit = intersects.find(hit => hit.object.geometry && hit.object.geometry instanceof THREE.SphereGeometry);
        
        if (nodeHit && nodeHit.object.userData.name) {
            this.onNodeSelect(nodeHit.object);
        }
    }

    cleanup() {
        window.removeEventListener('click', this._clickHandler);
        window.removeEventListener('touchstart', this._touchHandler);

        this.disposables.geometries.forEach(geo => geo.dispose());
        this.disposables.materials.forEach(mat => mat.dispose());
        this.disposables.textures.forEach(tex => tex.dispose());
        this.disposables.cssElements.forEach(el => el.remove());

        this.disposables.geometries = [];
        this.disposables.materials = [];
        this.disposables.textures = [];
        this.disposables.cssElements = [];
        this.pulsars = [];

        if (this.group) {
            this.scene.remove(this.group);
            this.group = null;
        }
    }
    
    update(delta, time, shouldRotate) {
        if (shouldRotate && this.group) {
            this.group.rotation.y += delta * 0.05;
            this.group.rotation.x = Math.sin(time * 0.2) * 0.05;
        }

        const pulse = 1.0 + Math.sin(time * 3.0) * 0.3; 
        this.pulsars.forEach(p => {
            p.scale.setScalar(pulse);
        });
    }
}