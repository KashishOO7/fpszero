import * as THREE from 'three';

export class Moon {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.sunLight = null;
        this.position = new THREE.Vector3(35, 25, -50); 
        this.radius = 4;
        this.isSouthernHemisphere = false;
        this.init();
    }
    init() {
        this.isSouthernHemisphere = this.detectHemisphere();
        const astroData = this.calculateRealTimePhase();
        localStorage.setItem('fps_moon_phase', `${astroData.phaseName} [Vis: ${astroData.illumination}%]`);
        const geometry = new THREE.SphereGeometry(this.radius, 64, 64);
        
        const textureLoader = new THREE.TextureLoader();
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.0,
            bumpScale: 0.05
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        
        textureLoader.load('Artifacts/textures/moon_color.jpg', (t) => { 
            this.mesh.material.map = t; 
            this.mesh.material.needsUpdate = true; 
        });
        textureLoader.load('Artifacts/textures/moon_displacement.jpg', (t) => { 
            this.mesh.material.bumpMap = t; 
            this.mesh.material.needsUpdate = true; 
        });

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        
        const earthshine = new THREE.PointLight(0x1a2b3c, 0.15);
        earthshine.position.copy(this.camera.position);
        
        this.scene.add(this.mesh);
        this.scene.add(this.sunLight);
        this.scene.add(earthshine);
        this.updateSunPosition(astroData.elongation);
    }

    detectHemisphere() {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const southernPatterns = [
                'Australia/', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Tahiti',
                'Pacific/Tongatapu', 'Pacific/Port_Moresby', 'Pacific/Noumea',
                'America/Argentina', 'America/Buenos_Aires', 'America/Sao_Paulo',
                'America/Santiago', 'America/Montevideo', 'America/La_Paz',
                'America/Lima', 'America/Bogota', 'Africa/Johannesburg', 
                'Africa/Harare', 'Africa/Maputo', 'Africa/Windhoek', 
                'Antarctica/', 'Indian/Mauritius', 'Asia/Jakarta'
            ];
            return southernPatterns.some(pattern => timezone.includes(pattern));
        } catch (e) {
            return false;
        }
    }

    updateSunPosition(elongation) {
        if (!this.mesh) return;
        const elongationRad = elongation * (Math.PI / 180);
        const angleFromFull = elongationRad - Math.PI;

        const sunDist = 100;

        let x = -sunDist * Math.sin(angleFromFull);
        let z = sunDist * Math.cos(angleFromFull);

        if (this.isSouthernHemisphere) {
            x = -x; 
        }

        const sunPos = new THREE.Vector3(x, 0, z).add(this.mesh.position);

        this.sunLight.position.copy(sunPos);
        this.sunLight.target = this.mesh;
        
        this.mesh.lookAt(this.camera.position); 
    }

    calculateRealTimePhase() {
        // J2000 Epoch Calculation
        const date = new Date();
        const jd = (date.getTime() / 86400000) + 2440587.5;
        const dt = jd - 2451545.0;

        // Sun's Longitude
        const D = 357.529 + 0.98560028 * dt;
        const L_sun = 280.459 + 0.98564736 * dt;
        const lambda_sun = L_sun + 1.915 * Math.sin(D * Math.PI/180) + 0.020 * Math.sin(2 * D * Math.PI/180);

        // Moon's Longitude
        const L_moon = 218.316 + 13.176396 * dt;
        const M_moon = 134.963 + 13.064993 * dt;
        const lambda_moon = L_moon + 6.289 * Math.sin(M_moon * Math.PI/180);

        // Elongation
        let elongation = (lambda_moon - lambda_sun) % 360;
        if (elongation < 0) elongation += 360;

        // Illumination Percentage
        const phaseRad = elongation * (Math.PI / 180);
        const illumination = (1 - Math.cos(phaseRad)) / 2;
        const visPercent = Math.round(illumination * 100);

        // Naming Logic
        const moonAge = (elongation / 360) * 29.53;
        
        let name = "New Moon";
        if (moonAge >= 1 && moonAge < 7) name = "Waxing Crescent";
        else if (moonAge >= 7 && moonAge < 8) name = "First Quarter";
        else if (moonAge >= 8 && moonAge < 14) name = "Waxing Gibbous";
        else if (moonAge >= 14 && moonAge < 16) name = "Full Moon";
        else if (moonAge >= 16 && moonAge < 22) name = "Waning Gibbous"; 
        else if (moonAge >= 22 && moonAge < 23) name = "Last Quarter";
        else if (moonAge >= 23 && moonAge < 29) name = "Waning Crescent";

        return {
            phaseName: name,
            illumination: visPercent,
            elongation: elongation // In Degrees
        };
    }

    update(time, delta) {
        if(this.mesh) this.mesh.lookAt(this.camera.position);
    }
}
