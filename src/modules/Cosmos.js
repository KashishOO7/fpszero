import * as THREE from 'three';

export class Cosmos {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.stars = null;
        
        this.meteorPool = [];
        this.poolSize = 20; 
        this.meteorSpawnTimer = 0;
        
        this.meteorMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.starCount = 6000;
        this.init();
    }

    init() {
        this.createStarfield();
        this.initMeteorPool();
        this.scene.add(this.group);
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.starCount * 3);
        const sizes = new Float32Array(this.starCount);
        const shifts = new Float32Array(this.starCount);
        const colors = new Float32Array(this.starCount * 3);

        for(let i = 0; i < this.starCount; i++) {
            const i3 = i * 3;
            const r = 800 + Math.random() * 1200; 
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3+1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3+2] = r * Math.cos(phi);
            
            sizes[i] = 1.0 + Math.random() * 2.5;
            shifts[i] = Math.random() * 100;
            
            const blueShift = Math.random() * 0.3;
            colors[i3] = 1.0; 
            colors[i3+1] = 0.95 + blueShift * 0.05; 
            colors[i3+2] = 1.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('shift', new THREE.BufferAttribute(shifts, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
                uniform float uTime;
                attribute float size;
                attribute float shift;
                varying float vOpacity;
                varying vec3 vColor;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (2000.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    float twinkle = 1.5 + (shift / 50.0);
                    vOpacity = 0.6 + 0.4 * sin(uTime * twinkle + shift);
                    
                    vColor = color; // Built-in attribute
                }
            `,
            fragmentShader: `
                varying float vOpacity;
                varying vec3 vColor;

                void main() {
                    float d = distance(gl_PointCoord, vec2(0.5));
                    if(d > 0.5) discard;
                    
                    float strength = 1.0 - (d * 2.0);
                    strength = pow(strength, 1.5);
                    
                    gl_FragColor = vec4(vColor * 1.5, strength * vOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });

        this.stars = new THREE.Points(geometry, material);
        this.group.add(this.stars);
    }

    initMeteorPool() {
        for(let i = 0; i < this.poolSize; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(6);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            
            const meteor = new THREE.Line(geometry, this.meteorMaterial);
            meteor.visible = false;
            meteor.frustumCulled = false;
            
            meteor.userData = { active: false, t: 0, start: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0 };
            this.group.add(meteor);
            this.meteorPool.push(meteor);
        }
    }

    spawnMeteor() {
        const meteor = this.meteorPool.find(m => !m.userData.active);
        if(!meteor) return;

        const data = meteor.userData;
        data.active = true;
        meteor.visible = true;
        data.t = 0;
        data.speed = 400 + Math.random() * 200;

        const startX = (Math.random() - 0.5) * 1000;
        const startY = 400 + Math.random() * 200;
        const startZ = -200 - Math.random() * 200;

        const endX = startX + (Math.random() - 0.5) * 300;
        const endY = startY - (100 + Math.random() * 100);
        
        data.start.set(startX, startY, startZ);
        data.dir.set(endX - startX, endY - startY, 0).normalize();
        
        const positions = meteor.geometry.attributes.position.array;
        positions.fill(0); 
        meteor.geometry.attributes.position.needsUpdate = true;
    }

    update(time, delta) {
        if (this.stars) {
            this.stars.material.uniforms.uTime.value = time;
            this.group.rotation.y = time * 0.015;
        }

        this.meteorSpawnTimer += delta;
        if (this.meteorSpawnTimer > 2.0 + Math.random() * 3.0) {
            this.spawnMeteor();
            this.meteorSpawnTimer = 0;
        }

        for (const meteor of this.meteorPool) {
            const data = meteor.userData;
            if (!data.active) continue;

            data.t += delta * data.speed;
            
            const headX = data.start.x + data.dir.x * data.t;
            const headY = data.start.y + data.dir.y * data.t;
            const headZ = data.start.z + data.dir.z * data.t;
            
            const lag = Math.max(0, data.t - 40);
            const tailX = data.start.x + data.dir.x * lag;
            const tailY = data.start.y + data.dir.y * lag;
            const tailZ = data.start.z + data.dir.z * lag;

            const positions = meteor.geometry.attributes.position.array;
            positions[0] = headX; positions[1] = headY; positions[2] = headZ;
            positions[3] = tailX; positions[4] = tailY; positions[5] = tailZ;
            
            meteor.geometry.attributes.position.needsUpdate = true;

            if (headY < -500 || data.t > 1000) {
                data.active = false;
                meteor.visible = false;
            }
        }
    }

    dispose() {
        if (this.stars) { this.stars.geometry.dispose(); this.stars.material.dispose(); }
        this.meteorPool.forEach(m => m.geometry.dispose());
        this.meteorMaterial.dispose();
        this.scene.remove(this.group);
    }
}